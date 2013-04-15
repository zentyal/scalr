
__version__ = '0.1.1'
__author__ = 'roman'

from gevent import monkey
monkey.patch_all()

import os
import sys
import yaml
import time
import gevent
import logging
import gearman
import urllib2
import binascii
import argparse
import traceback
import gevent.pool

from scalrpy import util
from sqlalchemy import and_
from sqlalchemy import func
from scalrpy.util import cryptotool
from sqlalchemy import exc as db_exc
from scalrpy.util.base_daemon import BaseDaemon


PID_FILE = '/var/run/scalr.messaging-worker.pid'
LOG_FILE = None

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ETC_DIR = os.path.abspath(BASE_DIR + '/../../../../etc')

LOG = logging.getLogger(__file__)

pool = None


def _server_is_active(srv):
    return srv.status in ('Running', 'Initializing', 'Importing', 'Temporary', 'Pending terminate')


def _encrypt(server_id, crypto_key, data, headers=None):
    crypto_algo = dict(name="des_ede3_cbc", key_size=24, iv_size=8)
    data = cryptotool.encrypt(crypto_algo, data, binascii.a2b_base64(crypto_key))
    headers = headers or {}

    headers['X-Signature'], headers['Date'] = \
            cryptotool.sign_http_request(data, crypto_key)
    headers['X-Server-Id'] = server_id

    return data, headers


class DeliveryError(Exception):

    def __init__(self, *args):
        self.code, self.message = args[0:2]
        if len(args) > 2:
            self.data = args[2]
        else:
            self.data = str(sys.exc_info()[1])
        Exception.__init__(self, *args)


def send(worker, raw_message_id):
    worker.is_working = True
    LOG.debug('Get message id: %s' %str(raw_message_id))
    try:
        worker.send(raw_message_id.data)
    except:
        LOG.error(util.exc_info())
    finally:
        worker.is_working = False
        return raw_message_id.data


class _GMWorker(gearman.GearmanWorker):

    def __init__(self, parent):
        super(_GMWorker, self).__init__(parent.config['connections']['gearman']['servers'])

        self.parent = parent
        self.is_working = False
        self._terminate_time = None


    def work(self, time_to_work=None):
        if time_to_work:
            self._terminate_time = time.time() + time_to_work

        self.parent.gm_workers.append(self)
        while True:
            try:
                gearman.GearmanWorker.work(self, poll_timeout=2)
                self.parent.gm_workers.remove(self)
                break
            except db_exc.OperationalError:
                LOG.error(util.exc_info())
                gevent.sleep(5)
            except (gearman.errors.ConnectionError, gearman.errors.ServerUnavailable):
                LOG.error(util.exc_info())
                gevent.sleep(5)
            except:
                LOG.error(util.exc_info())
                raise


    def after_poll(self, any_activity):
        continue_working = True
        if self._terminate_time:
            continue_working = time.time() < self._terminate_time\
                    or self.is_working or any_activity
        return continue_working


    def _spawn_gm_worker(self):
        global pool
        if not pool.full():
            gm_worker = _GMWorker(self.parent)
            gm_worker.register_task('message.send', send)
            pool.add(gevent.spawn(gm_worker.work, time_to_work=20))


    def send(self, message_id):
        LOG.debug('Processing message_id: %s' %message_id)

        self._spawn_gm_worker()

        db = self.parent.db_manager.get_db()
        msg = db.messages.filter_by(messageid=message_id).first()
        if not msg:
            LOG.warning('Message with message_id: %s not found' %message_id)
            db.session.close()
            db.session.remove()
            return

        try:
            srv = db.servers.filter_by(server_id=msg.server_id).first()
            if not srv:
                LOG.warning('Server with server_id: %s not found' %msg.server_id)
                msg.handle_attempts += 1
                msg.status = 0 if msg.handle_attempts < 3 else 3
                msg.dtlasthandleattempt = func.now()
                db.commit()
                db.session.close()
                db.session.remove()
                return
            if not _server_is_active(srv):
                LOG.warning('Server not active: %s' %message_id)
                msg.handle_attempts = 3
                msg.status = 3
                msg.dtlasthandleattempt = func.now()
                db.commit()
                db.session.close()
                db.session.remove()
                return

            where = and_(
                    db.server_properties.server_id==msg.server_id,
                    db.server_properties.name=='scalarizr.key')
            key = db.server_properties.filter(where).first().value
            try:
                where = and_(
                        db.server_properties.server_id==msg.server_id,
                        db.server_properties.name=='scalarizr.ctrl_port')
                port = db.server_properties.filter(where).first().value
            except:
                port = 8013
            db.session.close()
            db.session.remove()

            data, headers = _encrypt(msg.server_id, key, msg.message)
            url = 'http://%s:%s/%s' % (srv.remote_ip, port, 'control')
            req = urllib2.Request(url, data, headers)
            try:
                g = gevent.spawn(urllib2.urlopen, req)
                g.get(timeout=5)
                if g.value.code != 201:
                    raise DeliveryError(g.value.code, 'Delivery failed')
            except:
                LOG.warning('Delivery failed: %s %s' %(message_id, util.exc_info()))
                g.kill()
                db.session.add(msg)
                msg.handle_attempts += 1
                msg.status = 0 if msg.handle_attempts < 3 else 3
                msg.dtlasthandleattempt = func.now()
                db.commit()
                db.session.close()
                db.session.remove()
                return

            db.session.add(msg)
            msg.status = 1
            msg.message = ''
            if msg.message_name == 'ExecScript':
                db.delete(msg)
            msg.dtlasthandleattempt = func.now()
            db.commit()
            db.session.close()
            db.session.remove()
        except:
            LOG.error(util.exc_info())
        finally:
            # Don't close or remove session in finally
            #db.session.close()
            #db.session.remove()
            pass


def heartbeat(timeout, msg_wrk):
    while True:
        LOG.debug('I am alive! Number of workers: %s' %len(msg_wrk.gm_workers))
        gevent.sleep(timeout)


class MessagingWorker(BaseDaemon):

    def __init__(self, config):
        super(MessagingWorker, self).__init__(pid_file=PID_FILE, log_file=LOG_FILE)

        self.db_manager = None
        self.config = config
        self.gm_workers = []

        global pool
        pool = gevent.pool.Pool(self.config['net_pool_size'])


    def run(self):
        self.db_manager = util.DBManager(self.config['connections']['mysql'])
        db = self.db_manager.get_db()

        while True:
            # XXX next try-except block force load tables
            try:
                db.messages
                db.servers
                db.server_properties
                break
            except db_exc.OperationalError:
                LOG.error(util.exc_info())
                time.sleep(5)
                LOG.debug('Reconnecting...')
        try:
            global pool
            persistent_gm_workers = [_GMWorker(self) for i in range(2)]
            for wrk in persistent_gm_workers:
                wrk.register_task('message.send', send)
                pool.add(gevent.spawn(wrk.work))
            gevent.spawn(heartbeat, 10, self)
            pool.join()
        except:
            LOG.critical(util.exc_info())
            sys.exit(1)


def configure(args, config):
    global LOG_FILE
    global CRATIO
    global PID_FILE

    if args.pid:
        PID_FILE = args.pid
    else:
        if 'pid_file' in config:
            PID_FILE = config['pid_file']

    if 'log_file' in config:
        LOG_FILE = config['log_file']

    LOG = logging.getLogger(__file__)
    util.log_config(LOG, args.verbosity, log_file=LOG_FILE, log_size=1024*1000)


def main():
    try:
        parser = argparse.ArgumentParser()

        group = parser.add_mutually_exclusive_group()
        group.add_argument('--start', action='store_true',
                default=False, help='start daemon')
        group.add_argument('--stop', action='store_true',
                default=False, help='stop daemon')
        group.add_argument('--restart', action='store_true',
                default=False, help='restart daemon')
        parser.add_argument('--pid', default=None,
                help="Pid file")
        parser.add_argument('-c', '--config',
                default=ETC_DIR+'/config.yml', help='config file')
        parser.add_argument('-v', '--verbosity', action='count', default=0,
                help='increase output verbosity [0:4]. default is 0')
        parser.add_argument('--version', action='version',
                version='Version %s' %__version__)

        args = parser.parse_args()

        try:
            config = yaml.safe_load(
                    open(args.config))['scalr']['msg_sender']['worker']
        except:
            sys.stderr.write('Error load config file %s. Exit\n' %args.config)
            sys.exit(1)

        configure(args, config)
        daemon = MessagingWorker(config)

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
        traceback.print_exc()
        LOG.critical(util.exc_info())
        sys.exit(1)


if __name__ == '__main__':
    main()
