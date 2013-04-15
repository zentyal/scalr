
import os
import sys
import time
import signal
import atexit
import logging

from scalrpy import util


LOG = logging.getLogger(__file__)
LOG.setLevel(logging.DEBUG)
frmtr= logging.Formatter('%(asctime)s-%(name)s-%(levelname)s# %(message)s')



class BaseDaemon(object):

    def __init__(
                self, pid_file, log_file=None,
                stdin='/dev/null',
                stdout='/dev/null',
                stderr='/dev/null'):

        self.pid_file = pid_file
        self.log_file = log_file
        self.stdin = stdin
        self.stdout = stdout
        self.stderr = stderr

        if log_file:
            hndlr = logging.FileHandler(log_file, mode='w+')
        else:
            hndlr = logging.StreamHandler(stream=sys.stderr)

        hndlr.setFormatter(frmtr)
        hndlr.setLevel(logging.ERROR)

        global LOG
        LOG.addHandler(hndlr)

    def start(self):
        util.check_pid(self.pid_file, LOG)
        self.daemonize()
        self.run()

    def stop(self):
        try:
            pf = file(self.pid_file, 'r')
            pid = int(pf.read().strip())
            pf.close()
        except IOError:
            pid = None

        if not pid:
            message = "Pid file %s does not exist. Exit"
            LOG.critical(message % self.pid_file)
            return

        try:
            while 1:
                os.kill(pid, signal.SIGTERM)
                time.sleep(0.2)
        except OSError, err:
            err = str(err)
            if err.find("No such process") > 0:
                if os.path.exists(self.pid_file):
                    os.remove(self.pid_file)
                    self.running = False
            else:
                raise

    def restart(self):
        self.stop()
        self.start()

    def run(self):
        '''
        Override this method in derived class
        '''
        pass

    def delpid(self):
        LOG.critical('remove')
        os.remove(self.pid_file)

    def daemonize(self):
        try:
            # first fork
            pid = os.fork()
            if pid > 0:
                sys.exit(0)
        except OSError, e:
            LOG.error(e)
            raise

        os.chdir('/')
        os.setsid()
        os.umask(0)

        try:
            # second fork
            pid = os.fork()
            if pid > 0:
                sys.exit(0)
        except OSError, e:
            LOG.critical(e)
            raise

        atexit.register(self.delpid)
        pid = str(os.getpid())
        try:
            file(self.pid_file,'w+').write("%s\n" % pid)
        except Exception as e:
            LOG.critical(e)
            raise

        # redirect standard file descriptors
        sys.stdout.flush()
        sys.stderr.flush()
        si = file(self.stdin, 'r')
        so = file(self.stdout, "a+")
        se = file(self.stderr, "a+", 0)
        os.dup2(si.fileno(), sys.stdin.fileno())
        os.dup2(so.fileno(), sys.stdout.fileno())
        os.dup2(se.fileno(), sys.stderr.fileno())
