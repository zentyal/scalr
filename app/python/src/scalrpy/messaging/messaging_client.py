
__version__ = '0.1.2'
__author__ = 'roman'

import os
import sys
import time
import yaml
import logging
#import hashlib
import gearman
import argparse

from scalrpy import util
from scalrpy.util.base_daemon import BaseDaemon

from sqlalchemy import not_
from sqlalchemy import and_
from sqlalchemy import asc 
from sqlalchemy import func
from sqlalchemy import exc as db_exc

QSIZE = 1024
CRATIO = 120
QUEUE_SIZE = 50000

PID_FILE = '/var/run/scalr.messaging-client.pid'
LOG_FILE = None

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ETC_DIR = os.path.abspath(BASE_DIR + '/../../../../etc')

LOG = logging.getLogger(__file__)


class MessagingClient(BaseDaemon):

    def __init__(self, config):
        super(MessagingClient, self).__init__(pid_file=PID_FILE, log_file=LOG_FILE)

        self.config = config
        self.gm_hosts = list(config['connections']['gearman']['servers'])
        if not self.gm_hosts:
            LOG.critical('You must define at least one gearman server in your config file. Exit')
            sys.exit(1)
        self.gm_host = None
        self.gm_client = None
        self.submitted_jobs = {}


    def _set_new_gm_server(self, block=False):
        while True:
            if self.gm_host:
                self.gm_hosts.append(self.gm_host)

            for i in range(len(self.gm_hosts)):
                LOG.debug('Trying set new gearman server...')
                try:
                    self.gm_host = self.gm_hosts.pop(0)
                    gm_adm_client = gearman.GearmanAdminClient([self.gm_host])
                    gm_adm_client.ping_server()

                    ## GearmanAdminClient.send_maxqueue - python gearman client bug 
                    #try:
                    #    gm_adm_client.send_maxqueue('message.send', QUEUE_SIZE)
                    #except:
                    #    LOG.warning(util.exc_info())

                    self.gm_client = gearman.GearmanClient([self.gm_host])
                    LOG.debug('Gearman server: %s' % self.gm_host)
                    break

                except gearman.errors.ServerUnavailable:
                    LOG.error('%s %s' % (self.gm_host, util.exc_info()))
                    self.gm_hosts.append(self.gm_host)
                    self.gm_host = None
                except:
                    LOG.error(util.exc_info())
                    raise
            else:
                if block:
                    time.sleep(5)
                    continue
                else:
                    LOG.error('Set new gearman server failed')
                    raise gearman.errors.ServerUnavailable
            break
                

    def _update_submitted_jobs(self):
        for message_id in self.submitted_jobs.keys():
            req, lock_time = self.submitted_jobs[message_id]
            if time.time() > lock_time:
                del self.submitted_jobs[message_id]
                LOG.debug('DEL')


    def run(self):
        db_manager = util.DBManager(self.config['connections']['mysql'])
        db = db_manager.get_db()

        self._set_new_gm_server(block=True)

        timestep = 5
        while True:
            session = db.session
            try:
                gm_adm_client = gearman.GearmanAdminClient([self.gm_host])
                gm_adm_client.ping_server()

                # fix gearman v2.0.2 memory leak bug
                self.gm_client = gearman.GearmanClient([self.gm_host])

                self._update_submitted_jobs()

                if len(self.submitted_jobs) > 5000:
                    LOG.warning('Too much of a submitted jobs. Skip iteration')
                    time.sleep(timestep)
                    continue

                where1 = and_(
                        db.messages.type=='out',
                        db.messages.status==0,
                        db.messages.message_version==2)

                where2 = and_(
                        func.unix_timestamp(db.messages.dtlasthandleattempt) +\
                        db.messages.handle_attempts *\
                        CRATIO < func.unix_timestamp(func.now()))

                if self.submitted_jobs:
                    where3 = and_(not_(db.messages.messageid.in_(self.submitted_jobs.keys())))
                    msgs = session.query(db.messages.messageid,
                            db.messages.handle_attempts).filter(
                            where1, where2, where3).order_by(asc(db.messages.id)).all()[0:QSIZE]
                else:
                    msgs = session.query(db.messages.messageid,
                            db.messages.handle_attempts).filter(
                            where1, where2).order_by(asc(db.messages.id)).all()[0:QSIZE]

                for msg in msgs:
                    # simple unique version
                    req = self.gm_client.submit_job('message.send', msg.messageid,
                            unique=msg.messageid[0:64], wait_until_complete=False)
                    # sha256 unique version
                    '''
                    req = self.gm_client.submit_job('message.send', msg.messageid,
                            unique=hashlib.sha256(msg.messageid).hexdigest(),
                            wait_until_complete=False)
                    '''
                    self.gm_client.wait_until_jobs_accepted([req])
                    self.submitted_jobs.update({msg.messageid:(req,
                            int(time.time() + CRATIO * (msg.handle_attempts + 1)))})
                    LOG.info('Sumbit message: msg_id:%s' % msg.messageid)

            except db_exc.OperationalError:
                LOG.error(util.exc_info())
                time.sleep(5)
            except gearman.errors.ServerUnavailable:
                LOG.error(util.exc_info())
                self._set_new_gm_server(block=True)
            except:
                LOG.error(util.exc_info())
                raise
            finally:
                session.close()
                session.remove()

            time.sleep(timestep)


def configure(args, config):
    global LOG_FILE
    global CRATIO
    global PID_FILE
    global QUEUE_SIZE

    if 'log_file' in config:
        LOG_FILE = config['log_file']

    LOG = logging.getLogger(__file__)
    util.log_config(LOG, args.verbosity, log_file=LOG_FILE, log_size=1024*1000)

    if args.pid:
        PID_FILE = args.pid
    else:
        if 'pid_file' in config:
            PID_FILE = config['pid_file']

    if 'cratio' in config:
        CRATIO = config['cratio'] 

    try:
        QUEUE_SIZE = config['connections']['gearman']['queue_size']
    except:
        pass


def main():
    try:
        parser = argparse.ArgumentParser()

        group = parser.add_mutually_exclusive_group()
        group.add_argument('--start', action='store_true', default=False, help='start daemon')
        group.add_argument('--stop', action='store_true', default=False, help='stop daemon')
        group.add_argument('--restart', action='store_true', default=False, help='restart daemon')
        parser.add_argument('--pid', default=None, help="Pid file")
        parser.add_argument('-c', '--config', default=ETC_DIR+'/config.yml', help='config file')
        parser.add_argument('-v', '--verbosity', action='count',
                            default=0, help='increase output verbosity [0:4]. default is 0')
        parser.add_argument('--version', action='version',
                version='Version %s' %__version__)

        args = parser.parse_args()

        try:
            config = yaml.safe_load(
                    open(args.config))['scalr']['msg_sender']['client']
        except:
            sys.stderr.write('Error load config file %s. Exit\n' % args.config)
            sys.exit(1)

        configure(args, config)
        daemon = MessagingClient(config)

        if args.start:
            print 'start'
            LOG.info('start')
            daemon.start()
        elif args.stop:
            print 'stop'
            LOG.info('stop')
            daemon.stop()
        elif args.restart:
            print 'restart'
            LOG.info('restart')
            daemon.restart()
        else:
            print 'Usage %s -h' % sys.argv[0]

    except SystemExit:
        pass
    except:
        LOG.critical(util.exc_info())
        sys.exit(1)


if __name__ == '__main__':
    main()
