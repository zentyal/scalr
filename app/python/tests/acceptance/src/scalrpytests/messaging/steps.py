
from lettuce import *

import os
import yaml
import time
import string
import random
import gearman
import threading
import subprocess as subps

from scalrpy import util
from sqlalchemy import and_
from sqlalchemy import desc
from sqlalchemy import func

from scalrpytests.steplib import lib


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ETC_DIR = os.path.abspath(BASE_DIR + '/../../../../etc')


@step(u"I have test config")
def test_config(step):
    try:
        world.config = yaml.safe_load(
                open(ETC_DIR + '/config.yml'))['scalr']['msg_sender']['client']
        assert True
    except:
        assert False


@step(u'I wait (\d+) seconds')
def wait_sec(step, sec):
    lib.wait_sec(int(sec))
    assert True


@step(u"I drop test database")
def drop_db(step):
    assert lib.drop_db(world.config['connections']['mysql'])


@step(u"I create test database")
def create_db(step):
    assert lib.create_db(world.config['connections']['mysql'])


@step(u"I create table '(.*)' in test database")
def create_table(step, tbl_name):
    if tbl_name == 'clients':
        assert lib.create_clients_table(world.config['connections']['mysql'])
    elif tbl_name == 'farms':
        assert lib.create_farms_table(world.config['connections']['mysql'])
    elif tbl_name == 'farm_roles':
        assert lib.create_farm_roles_table(world.config['connections']['mysql'])
    elif tbl_name == 'servers':
        assert lib.create_servers_table(world.config['connections']['mysql'])
    elif tbl_name == 'server_properties':
        assert lib.create_server_properties_table(world.config['connections']['mysql'])
    elif tbl_name == 'messages':
        assert lib.create_messages_table(world.config['connections']['mysql'])
    else:
        assert False


@step(u"I have (\d+) messages with status (\d+) and type '(.*)'")
def fill_tables(step, count, st, tp):
    try:
        world.msgs_id = {}
        world.srvs_id = []

        db_manager = util.DBManager(world.config['connections']['mysql'])
        db = db_manager.get_db()

        for i in range(int(count)):
            while True:
                msg_id = ''.join(random.choice(string.ascii_uppercase +\
                        string.digits) for x in range(75))
                if db.messages.filter(
                        db.messages.messageid==msg_id).first() is None:
                    break
                continue
            while True:
                srv_id = ''.join(random.choice(string.ascii_uppercase +\
                        string.digits) for x in range(36))
                if db.servers.filter(
                        db.servers.server_id==srv_id).first() is None:
                    break
                continue
            db.messages.insert(
                    messageid=msg_id, status=int(st), handle_attempts=0,
                    message_name='ExecScript__',
                    dtlasthandleattempt=func.now(), message='some text here',
                    server_id=srv_id, type='%s' %tp, message_version=2)
            world.msgs_id.setdefault(msg_id, {}).setdefault('status', st)
            db.servers.insert(
                    server_id=srv_id, env_id=1, status='Running',
                    remote_ip='1.0.0.1')
            world.srvs_id.append(srv_id)
        db.commit()
        for srv_id in world.srvs_id:
            db.server_properties.insert(
                    server_id=srv_id, name='scalarizr.key', value='hoho')
            db.server_properties.insert(
                    server_id=srv_id, name='scalarizr.ctrl_port', value='8013')
        db.commit()
        db.session.close()
        assert True
    except:
        assert False


@step(u"I make prepare")
def prepare(step):
    step.given("I have test config")
    step.given("I stop all mysql servers")
    step.given("I start mysql server")
    step.given("I drop test database")
    step.given("I create test database")
    step.given("I create table 'messages' in test database")
    step.given("I create table 'servers' in test database")
    step.given("I create table 'server_properties' in test database")
    step.given("I stop all gearman servers")


world.gm_srvs = {}
@step(u"I start gearman server on port (\d+)")
def start_gearman_server(step, port):
    try:
        world.gm_srvs[int(port)] = subps.Popen(['gearmand', '--port=%s' %int(port)])
        time.sleep(1)
        ps = subps.Popen(['ps -ef'], shell=True, stdout=subps.PIPE)
        output = ps.stdout.read()
        ps.stdout.close()
        ps.wait()
        assert 'gearmand --port=%s' %int(port) in output
    except:
        assert False


@step(u"I stop all gearman servers")
def stop_all_gearman_servers(step):
    try:
        subps.call(['killall', '-9', 'gearmand'])
        assert True
    except:
        assert False


@step(u"I stop gearman server on port (\d+)")
def stop_server(step, port):
    try:
        world.gm_srvs[int(port)].terminate()
        assert True
    except:
        assert False


@step(u"I stop all mysql servers")
def stop_all_mysql_servers(step):
    try:
        subps.call(['service', 'mysql', 'stop'])
        assert True
    except:
        try:
            subps.call(['killall', '-9', 'mysqld'])
            assert True
        except:
            assert False


@step(u"I start mysql server")
def start_mysql_server(step):
    try:
        subps.call(['service', 'mysql', 'start'])
        assert True
    except:
        try:
            subps.call(['mysqld'])
            #time.sleep(3)
            #ps = subps.Popen(['ps -ef'], shell=True, stdout=subps.PIPE)
            #output = ps.stdout.read()
            #ps.stdout.close()
            #ps.wait()
            #assert 'mysqld' in output
            assert True
        except:
            assert False


right_msgs = None 
@step(u"I start client")
def start_client(step):
    try:
        QSIZE = 1024
        CRATIO = 120 # Common ratio for send interval progression
        db_manager = util.DBManager(world.config['connections']['mysql'])
        db = db_manager.get_db()
        where1 = and_(db.messages.type=='out')
        where2 = and_(db.messages.message_version==2)
        where3 = and_(func.unix_timestamp(db.messages.dtlasthandleattempt) +\
                db.messages.handle_attempts * CRATIO < func.unix_timestamp(
                func.now()))
        msgs = db.messages.filter(db.messages.status==0,\
                where1, where2, where3).order_by(
                desc(db.messages.id)).all()[0:QSIZE]
        global right_msgs
        right_msgs = msgs

        cnf = ETC_DIR + '/config.yml'
        subps.Popen(['python', '-m', 'scalrpy.messaging.messaging_client', '--start', '-c', cnf])
        time.sleep(2)
        ps = subps.Popen(['ps -ef'], shell=True, stdout=subps.PIPE)
        output = ps.stdout.read()
        ps.stdout.close()
        ps.wait()
        assert 'messaging_client' in output
    except:
        assert False
    finally:
        db.session.close()
        db.session.remove()


@step(u"I stop client")
def stop_client(step):
    try:
        subps.Popen(['python', '-m', 'scalrpy.messaging.messaging_client', '--stop'])
        time.sleep(2)
        ps = subps.Popen(['ps -ef'], shell=True, stdout=subps.PIPE)
        output = ps.stdout.read()
        ps.stdout.close()
        ps.wait()
        assert 'messaging_client' not in output
    except:
        assert False


tst_wrk_terminate = False
class TestWorker(gearman.GearmanWorker):
    def after_poll(self, any_activity):
        return not tst_wrk_terminate


received_msgs_id = []
def test_send(worker, raw_message_id):
    global received_msgs_id
    received_msgs_id.append(str(raw_message_id.data))
    return raw_message_id.data


@step(u'I start test worker')
def start_test_worker(step):
    global tst_wrk_terminate
    tst_wrk_terminate = False
    gm_worker = TestWorker(['localhost'])
    gm_worker.register_task('message.send', test_send)
    world.tst_wrk_thread = threading.Thread(target=gm_worker.work, kwargs={'poll_timeout':2})
    world.tst_wrk_thread.start()
    time.sleep(1)
    assert world.tst_wrk_thread.is_alive()


@step(u'I stop test worker')
def stop_test_worker(step):
    global tst_wrk_terminate
    tst_wrk_terminate = True
    timeout = 5
    while timeout > 0:
        if not world.tst_wrk_thread.is_alive():
            assert True
            break
        time.sleep(1)
        timeout -= 1
    else:
        assert False


@step(u'I get (\d+) right messages ID from gearman server')
def check_get_message(step, count):
    if len(received_msgs_id) != int(count):
        assert False

    for msg in right_msgs:
        assert msg.messageid in received_msgs_id


@step(u"I start worker")
def start_worker(step):
   try:
       cnf = ETC_DIR + '/config.yml'
       subps.Popen(['python', '-m', 'scalrpy.messaging.messaging_worker', '-vvvv', '--start', '-c', cnf])
       time.sleep(2)
       ps = subps.Popen(['ps -ef'], shell=True, stdout=subps.PIPE)
       output = ps.stdout.read()
       ps.stdout.close()
       ps.wait()
       assert 'messaging_worker' in output
   except:
       assert False


@step(u"I stop worker")
def stop_worker(step):
    try:
        subps.Popen(['python', '-m', 'scalrpy.messaging.messaging_worker', '--stop'])
        time.sleep(2)
        ps = subps.Popen(['ps -ef'], shell=True, stdout=subps.PIPE)
        output = ps.stdout.read()
        ps.stdout.close()
        ps.wait()
        assert 'messaging_worker' not in output
    except:
        assert False


@step(u'I see right messages has status (\d+)')
def check_message_status(step, st):
    db_manager = util.DBManager(world.config['connections']['mysql'])
    db = db_manager.get_db()
    try:
        _id = [_.messageid for _ in right_msgs]
        msgs = db.messages.filter(db.messages.messageid.in_(_id)).all()
        for msg in msgs:
            assert msg.status == 1
    except:
        assert False
    finally:
        try:
            db.session.close()
            db.session.remove()
        except:
            pass


@step(u'I see right messages deleted from database')
def check_message_deleted(step):
    db_manager = util.DBManager(world.config['connections']['mysql'])
    db = db_manager.get_db()
    try:
        _id = [_.messageid for _ in right_msgs]
        msgs = db.messages.filter(db.messages.messageid.in_(_id)).all()
        assert len(msgs) == 0 
    except:
        assert False
    finally:
        try:
            db.session.close()
            db.session.remove()
        except:
            pass


@step(u'I start timer')
def start_timer(step):
    world.timestamp = time.time()


@step(u'I stop timer')
def stop_timer(step):
    LOG.debug('timer: %s' %(time.time() - world.timestamp))
