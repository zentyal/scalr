
__version__ = '0.1.0'
__author__ = 'roman'

import os
import sys
import time
import yaml
import Queue
import netsnmp
import logging
import rrdtool
import argparse
import threading
import multiprocessing

from sqlalchemy import and_
from sqlalchemy import exc as db_exc

from scalrpy import util
from scalrpy.util.scalarizr_api.binding.jsonrpc_http import HttpServiceProxy


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ETC_DIR = os.path.abspath(BASE_DIR + '/../../../../etc')

PID_FILE = '/var/run/scalr.stats-poller.pid'
LOG_FILE = None

LOG = logging.getLogger(__file__)

FQ_SIZE = 1000
Q1_SIZE = 1000 * 20
Q2_SIZE = 1000 * 5

F_WRK_NUM = 1
Q1_WRK_NUM = 10
Q2_WRK_NUM = 2

RRD_DB_DIR = '/tmp/rrd_db_dir'

farm_queue = multiprocessing.Queue(FQ_SIZE)
queue1 = Queue.Queue(Q1_SIZE)
queue2 = Queue.Queue(Q2_SIZE)

oids_data = {
        'cpu':{
                'user':'.1.3.6.1.4.1.2021.11.50.0',
                'nice':'.1.3.6.1.4.1.2021.11.51.0',
                'system':'.1.3.6.1.4.1.2021.11.52.0',
                'idle':'.1.3.6.1.4.1.2021.11.53.0'},
        'la':{
                'la1':'.1.3.6.1.4.1.2021.10.1.3.1',
                'la5':'.1.3.6.1.4.1.2021.10.1.3.2',
                'la15':'.1.3.6.1.4.1.2021.10.1.3.3'},
        'mem':{
                'swap':'.1.3.6.1.4.1.2021.4.3.0',
                'swapavail':'.1.3.6.1.4.1.2021.4.4.0',
                'total':'.1.3.6.1.4.1.2021.4.5.0',
                'avail':'.1.3.6.1.4.1.2021.4.6.0',
                'free':'.1.3.6.1.4.1.2021.4.11.0',
                'shared':'.1.3.6.1.4.1.2021.4.13.0',
                'buffer':'.1.3.6.1.4.1.2021.4.14.0',
                'cached':'.1.3.6.1.4.1.2021.4.15.0'},
        'net':{
                'in':'.1.3.6.1.2.1.2.2.1.10.2',
                'out':'.1.3.6.1.2.1.2.2.1.16.2'}}

cpu_source = [
        'DS:user:COUNTER:600:U:U',
        'DS:system:COUNTER:600:U:U',
        'DS:nice:COUNTER:600:U:U',
        'DS:idle:COUNTER:600:U:U',]

cpu_archive = [
        'RRA:AVERAGE:0.5:1:800',
        'RRA:AVERAGE:0.5:6:800',
        'RRA:AVERAGE:0.5:24:800',
        'RRA:AVERAGE:0.5:288:800',
        'RRA:MAX:0.5:1:800',
        'RRA:MAX:0.5:6:800',
        'RRA:MAX:0.5:24:800',
        'RRA:MAX:0.5:288:800',
        'RRA:LAST:0.5:1:800',
        'RRA:LAST:0.5:6:800',
        'RRA:LAST:0.5:24:800',
        'RRA:LAST:0.5:288:800']

la_source = [
        'DS:la1:GAUGE:600:U:U',
        'DS:la5:GAUGE:600:U:U',
        'DS:la15:GAUGE:600:U:U']

la_archive = [
        'RRA:AVERAGE:0.5:1:800',
        'RRA:AVERAGE:0.5:6:800',
        'RRA:AVERAGE:0.5:24:800',
        'RRA:AVERAGE:0.5:288:800',
        'RRA:MAX:0.5:1:800',
        'RRA:MAX:0.5:6:800',
        'RRA:MAX:0.5:24:800',
        'RRA:MAX:0.5:288:800',
        'RRA:LAST:0.5:1:800',
        'RRA:LAST:0.5:6:800',
        'RRA:LAST:0.5:24:800',
        'RRA:LAST:0.5:288:800']

mem_source = [
        'DS:swap:GAUGE:600:U:U',
        'DS:swapavail:GAUGE:600:U:U',
        'DS:total:GAUGE:600:U:U',
        'DS:avail:GAUGE:600:U:U',
        'DS:free:GAUGE:600:U:U',
        'DS:shared:GAUGE:600:U:U',
        'DS:buffer:GAUGE:600:U:U',
        'DS:cached:GAUGE:600:U:U']

mem_archive = [
        'RRA:AVERAGE:0.5:1:800',
        'RRA:AVERAGE:0.5:6:800',
        'RRA:AVERAGE:0.5:24:800',
        'RRA:AVERAGE:0.5:288:800',
        'RRA:MAX:0.5:1:800',
        'RRA:MAX:0.5:6:800',
        'RRA:MAX:0.5:24:800',
        'RRA:MAX:0.5:288:800',
        'RRA:LAST:0.5:1:800',
        'RRA:LAST:0.5:6:800',
        'RRA:LAST:0.5:24:800',
        'RRA:LAST:0.5:288:800']

net_source = [
        'DS:in:COUNTER:600:U:21474836480',
        'DS:out:COUNTER:600:U:21474836480']

net_archive = [
        'RRA:AVERAGE:0.5:1:800',
        'RRA:AVERAGE:0.5:6:800',
        'RRA:AVERAGE:0.5:24:800',
        'RRA:AVERAGE:0.5:288:800',
        'RRA:MAX:0.5:1:800',
        'RRA:MAX:0.5:6:800',
        'RRA:MAX:0.5:24:800',
        'RRA:MAX:0.5:288:800',
        'RRA:LAST:0.5:1:800',
        'RRA:LAST:0.5:6:800',
        'RRA:LAST:0.5:24:800',
        'RRA:LAST:0.5:288:800']

servers_num_source = [
        'DS:s_running:GAUGE:600:U:U']

servers_num_archive = [
        'RRA:AVERAGE:0.5:1:800',
        'RRA:AVERAGE:0.5:6:800',
        'RRA:AVERAGE:0.5:24:800',
        'RRA:AVERAGE:0.5:288:800',
        'RRA:MAX:0.5:1:800',
        'RRA:MAX:0.5:6:800',
        'RRA:MAX:0.5:24:800',
        'RRA:MAX:0.5:288:800',
        'RRA:LAST:0.5:1:800',
        'RRA:LAST:0.5:6:800',
        'RRA:LAST:0.5:24:800',
        'RRA:LAST:0.5:288:800']

io_source = [
        'DS:read:COUNTER:600:U:U',
        'DS:write:COUNTER:600:U:U',
        'DS:rbyte:COUNTER:600:U:U',
        'DS:wbyte:COUNTER:600:U:U',]

io_archive = [
        'RRA:AVERAGE:0.5:1:800',
        'RRA:AVERAGE:0.5:6:800',
        'RRA:AVERAGE:0.5:24:800',
        'RRA:AVERAGE:0.5:288:800',
        'RRA:MAX:0.5:1:800',
        'RRA:MAX:0.5:6:800',
        'RRA:MAX:0.5:24:800',
        'RRA:MAX:0.5:288:800',
        'RRA:LAST:0.5:1:800',
        'RRA:LAST:0.5:6:800',
        'RRA:LAST:0.5:24:800',
        'RRA:LAST:0.5:288:800']



def scheduler(connection, mode, metric):
    """This function gets farms and puts it into farm queue then run farm workers"""
    '''
    :type connection: dictionary
    :param connection: Database connection info. Example:
        {
            'user':'user',
            'pass':'pass',
            'host':'localhost',
            'name':'scalr',
            'driver':'mysql+pymysql',
            'pool_recycle':120,
            'pool_size':4}

    :type mode: string
    :param mode: Mode [snmp | scalarizr_api]

    :type task: list of strings
    :param task: Tasks list [cpu | mem | net | la | io]
    '''
    global farm_queue

    db_manager = util.DBManager(connection)
    db = db_manager.get_db()
    session = db.session

    clients = [cli.id for cli in session.query(db.clients.id).filter_by(status='Active').all()]
    if not clients:
        LOG.info('Nothing to do. Exit')
        return

    where_farms = and_(
            db.farms.status==1, db.farms.clientid.in_(clients))
    farms = dict((farm.id, farm.hash)
            for farm in session.query(db.farms.id, db.farms.hash).filter(where_farms).all())
    if not farms:
        LOG.info('Nothing to do. Exit')
        return

    servers = session.query(db.servers.server_id, db.servers.farm_id, db.servers.farm_roleid,
            db.servers.index, db.servers.remote_ip).filter(and_(
            db.servers.farm_id.in_(farms.keys()),
            db.servers.status=='Running',
            db.servers.remote_ip!='None')).all()

    servers_id = [srv.server_id for srv in servers]
    if not servers_id:
        LOG.info('Nothing to do. Exit')
        return
    
    if mode == 'snmp': 
        where_port = and_(
                db.server_properties.server_id.in_(servers_id),
                db.server_properties.name=='scalarizr.snmp_port')
    elif mode == 'scalarizr_api':
        where_port = and_(
                db.server_properties.server_id.in_(servers_id),
                db.server_properties.name=='scalarizr.api_port')
        where_key = and_(
                db.server_properties.server_id.in_(servers_id),
                db.server_properties.name=='scalarizr.key')
        keys = dict((prop.server_id, prop.value)
                for prop in session.query(db.server_properties.server_id,
                        db.server_properties.value).filter(where_key).all())

    ports = dict((prop.server_id, prop.value)
            for prop in session.query(db.server_properties.server_id,
                    db.server_properties.value).filter(where_port).all())

    session.close()
    session.remove()

    farms_to_process = {} 
    for srv in servers:
        farm_id = srv.farm_id
        farm_role_id = srv.farm_roleid
        index = srv.index
        host = srv.remote_ip
        if mode == 'snmp': 
            community = farms[farm_id]
            try:
                port = ports[srv.server_id]
            except:
                port =  161
            connection_info = [host, port, community]
        elif mode == 'scalarizr_api':
            try:
                key = keys[srv.server_id]
            except:
                LOG.warning('Scalarizr key not found')
                continue
            try:
                port = ports[srv.server_id]
            except:
                port = 8010
            connection_info = [host, port, key]
        farms_to_process.setdefault(farm_id, {}).setdefault(farm_role_id, []).append(\
                [index, connection_info])

    farm_workers = [
            multiprocessing.Process(target=FarmWorker(), args=(mode, metric,))
            for n in range(F_WRK_NUM)]

    try:
        for p in farm_workers:
            p.start()

        for farm in farms_to_process.items():
            farm_queue.put(['farm', farm])

        farm_queue.put(['done'])
        LOG.debug('Put farm task done')

        for p in farm_workers:
            p.join()

    except KeyboardInterrupt:
        LOG.debug('Kill all farm workers')
        for p in farm_workers:
            LOG.debug('Terminate...')
            p.terminate()
        raise



class SNMPStrategy(object):

    def get_data(self, connection_info, metric):
        '''
        type connection_info: list of strings
        param connection_info: List [host, port, community]

        type task: list of strings
        param task: List [cpu | mem | la | net] io - not supported by snmp strategy

        return: dictionary { 
                'cpu':{
                        'user':1234,
                        'nice':1234,
                        ...}
                'la':{
                        'la1':0.1,
                        ...}
                'mem':{
                        'swap':12345,
                        ...}
                'net':{
                        'in':12345,
                        'out':12345}}
        '''

        host = connection_info[0]
        port = connection_info[1]
        community = connection_info[2]

        oids = []
        for metric_name in metric:
            oids += oids_data[metric_name].values()

        session = netsnmp.Session(
                DestHost = '%s:%s' %(host, port),
                Version = 1,
                Community = community)
        Vars = netsnmp.VarList(*oids)
        
        snmp_data = dict((oid, val) for oid, val in zip(oids, session.get(Vars)))

        def _convert_from_str(value):
            if type(value) is str:
                if '.' in value:
                    return float(value)
                else:
                    return int(value)
            else:
                return 'U'

        for oid, value in snmp_data.iteritems():
            snmp_data[oid] = _convert_from_str(value)

        data = {}
        for metric_name in metric:
            for metric in oids_data[metric_name].keys():
                data.setdefault(metric_name, {}).setdefault(
                        metric, snmp_data[oids_data[metric_name][metric]])
        return data



# todo
class ScalarizrAPIStrategy(object):

    def _get_cpu_stat(self, hsp):
        try:
            cpu = hsp.sysinfo.cpu_stat(timeout=1)
        except:
            LOG.error(util.exc_info())
            cpu = {'user':'U', 'nice':'U', 'system':'U', 'idle':'U'}
        return {'cpu':{
                    'user':cpu['user'],
                    'system':cpu['system'],
                    'nice':cpu['nice'],
                    'idle':cpu['idle']}}

    def _get_la_stat(self, hsp):
        try:
            la = hsp.sysinfo.load_average(timeout=1)
        except:
            LOG.error(util.exc_info())
            la = ['U', 'U', 'U']
        return {'la':{'la1':la[0], 'la5':la[1], 'la15':la[2]}}

    def _get_mem_info(self, hsp):
        try:
            mem = hsp.sysinfo.mem_info(timeout=1)
        except:
            LOG.error(util.exc_info())
            mem = {
                    'total_swap':'U',
                    'avail_swap':'U',
                    'total_real':'U',
                    'total_free':'U',
                    'shared':'U',
                    'buffer':'U',
                    'cached':'U'}
        return {'mem':{
                    'swap':mem['total_swap'],
                    'swapavail':mem['avail_swap'],
                    'total':mem['total_real'],
                    'avail':0,# Fix Me
                    'free':mem['total_free'],
                    'shared':mem['shared'],
                    'buffer':mem['buffer'],
                    'cached':mem['cached']}}

    def _get_net_stat(self, hsp):
        try:
            net = hsp.sysinfo.net_stats(timeout=1)
        except:
            LOG.error(util.exc_info())
            net = {'eth0':{'receive':{'bytes':'U'}, 'transmit':{'bytes':'U'}}}
        return {'net':{
                    'in':net['eth0']['receive']['bytes'],
                    'out':net['eth0']['transmit']['bytes']}}

    def _get_io_stat(self, hsp):
        try:
            io = hsp.sysinfo.disk_stats(timeout=1)
        except:
            LOG.error(util.exc_info())
            io = {}
        io = dict((str(dev), {'read':io[dev]['read']['num'], 'write':io[dev]['write']['num'],
                'rbyte':io[dev]['read']['bytes'], 'wbyte':io[dev]['write']['bytes']})
                for dev in io)
        return {'io':io}

    def get_data(self, connection_info, metric):
        '''
        type connection_info: list of strings
        param connection_info: List [host, port, key]

        type task: list of strings
        param task: List [cpu | mem | la | net | io]

        return: dictionary { 
                'cpu':{
                        'user':1234,
                        'nice':1234,
                        ...}
                'la':{
                        'la1':0.1,
                        ...}
                'mem':{
                        'swap':12345,
                        ...}
                'net':{
                        'in':12345,
                        'out':12345}}
        '''

        host = connection_info[0]
        port = connection_info[1]
        key = connection_info[2]

        data = {}
        hsp = HttpServiceProxy('http://%s:%s' %(host, port), key)
        if 'cpu' in metric:
            data.update(self._get_cpu_stat(hsp))
        if 'la' in metric:
            data.update(self._get_la_stat(hsp))
        if 'mem' in metric:
            data.update(self._get_mem_info(hsp))
        if 'net' in metric:
            data.update(self._get_net_stat(hsp))
        if 'io' in metric:
            data.update(self._get_io_stat(hsp))
        return data



class StatisticWorker(object):

    def __init__(self, strategy, ra, fa):
        StatisticWorker.terminate = False
        self._strategy = strategy
        self.ra = ra
        self.fa = fa

    def _work(self, metric):
        global queue1
        global queue2

        while not StatisticWorker.terminate or queue1.qsize() != 0:
            try:
                task = queue1.get(False)
            except:
                time.sleep(1)
                continue

            task_name = task[0]
            if task_name == 'server':
                farm_id = task[1]
                farm_role_id = task[2]
                index = task[3]
                connection_info = task[4]

                data = self._strategy.get_data(connection_info, metric)
                if not data:
                    continue

                # calc role and farm average
                for metric_group, metrics in data.iteritems():
                    if metric_group == 'io':
                        continue
                    for metric_name, value in metrics.iteritems():
                        try:
                            self.ra[farm_id][farm_role_id][metric_group][metric_name][1] += value
                            self.ra[farm_id][farm_role_id][metric_group][metric_name][0] += 1
                        except:
                            self.ra.setdefault(
                                    farm_id, {}).setdefault(
                                    farm_role_id, {}).setdefault(
                                    metric_group, {}).setdefault(
                                    metric_name, [1 if value != 'U' else 0, value])
                        try:
                            self.fa[farm_id][metric_group][metric_name][1] += value
                            self.fa[farm_id][metric_group][metric_name][0] += 1
                        except:
                            self.fa.setdefault(
                                    farm_id, {}).setdefault(
                                    metric_group, {}).setdefault(
                                    metric_name, [1 if value != 'U' else 0, value])

                rrd_task = ['server', farm_id, farm_role_id, index, data]
                while True:
                    try:
                        queue2.put(rrd_task, False)
                        break
                    except:
                        time.sleep(1)
            elif task_name == 'done':
                StatisticWorker.terminate = True

    def __call__(self, metric):
        try:
            self._work(metric)
        except:
            LOG.error(util.exc_info())



class FarmWorker():
    terminate = multiprocessing.Value('i', 0)

    def __init__(self):
        FarmWorker.terminate.value = 0
        self.ra = {}
        self.fa = {}
        self.rs = {}
        self.fs = {}

    def _process_task(self, task):
        global queue1

        task_name = task[0]
        if task_name == 'farm':
            farm = task[1]
            farm_id = farm[0]
            roles = farm[1]
            for farm_role_id, servers in roles.iteritems():
                for server in servers:
                    index = server[0]
                    connection_info = server[1]
                    
                    while True:
                        if F_WRK_NUM > 1 and queue1.qsize() > 200:
                            time.sleep(2)
                            continue
                        try:
                            queue1.put(['server', farm_id, farm_role_id,\
                                    index, connection_info], False)
                            break
                        except:
                            time.sleep(1)

                    rs_key = '%s/%s' % (farm_id, farm_role_id)
                    fs_key = '%s' % farm_id
                    try:
                        self.rs[rs_key]['servers']['s_running'] += 1
                    except:
                        self.rs.setdefault(rs_key, {}).setdefault(
                                'servers', {}).setdefault('s_running', 1)
                    try:
                        self.fs[fs_key]['servers']['s_running'] += 1
                    except:
                        self.fs.setdefault(fs_key, {}).setdefault(
                                'servers', {}).setdefault('s_running', 1)
        elif task_name == 'done':
            FarmWorker.terminate.value = 1

    def _work(self, mode, metric):
        global farm_queue

        rrd_workers = [RRDWorker() for i in range(Q2_WRK_NUM)]
        rrd_threads = [threading.Thread(target=w) for w in rrd_workers]
        for t in rrd_threads:
            t.start()

        if mode == 'snmp':
            strategy = SNMPStrategy()
        elif mode == 'scalarizr_api':
            strategy = ScalarizrAPIStrategy()

        statistic_workers = [StatisticWorker(strategy, self.ra, self.fa)
                for i in range(Q1_WRK_NUM)]

        statistic_threads = [threading.Thread(target=wrk, args=(metric,))
                for wrk in statistic_workers]

        for t in statistic_threads:
            t.start()

        while not FarmWorker.terminate.value or farm_queue.qsize() != 0:
            try:
                task = farm_queue.get(False)
            except:
                time.sleep(1)
                continue

            self._process_task(task)

        queue1.put(['done'])
        LOG.debug('Put queue1 task done')

        for t in statistic_threads:
            t.join()

        self.ra_processing(self.ra)
        self.fa_processing(self.fa)
        self.rs_processing(self.rs)
        self.fs_processing(self.fs)

        queue2.put(['done'])
        LOG.debug('Put queue2 done')

        for t in rrd_threads:
            t.join()

    def __call__(self, mode, metric):
        try:
            self._work(mode, metric)
        except:
            LOG.error(util.exc_info())

    def ra_processing(self, ra):
        global queue2
        
        for farm_id, roles in ra.iteritems():
            for farm_role_id, metric_groups in roles.iteritems():
                for metric_group, metrics in metric_groups.iteritems():
                    for metric_name, value in metrics.iteritems():
                        try:
                            ra[farm_id][farm_role_id][metric_group][metric_name] = \
                                    (value[1] / value[0])
                        except:
                            ra[farm_id][farm_role_id][metric_group][metric_name] = 'U'

                while True:
                    try:
                        queue2.put(
                                ['ra', farm_id, farm_role_id, ra[farm_id][farm_role_id]], False)
                        break
                    except:
                        time.sleep(1)

    def fa_processing(self, fa):
        global queue2
        
        for farm_id, metric_groups in fa.iteritems():
            for metric_group, metrics in metric_groups.iteritems():
                for metric_name, value in metrics.iteritems():
                    try:
                        fa[farm_id][metric_group][metric_name] = \
                                (value[1] / value[0])
                    except:
                        fa[farm_id][metric_group][metric_name] = 'U'

            while True:
                try:
                    queue2.put(
                            ['fa', farm_id, fa[farm_id]], False)
                    break
                except:
                    time.sleep(1)

    def rs_processing(self, rs):
        global queue2

        for k, v in rs.iteritems():
            k_split = k.split('/')
            while True:
                try:
                    queue2.put(['rs', k_split[0], k_split[1], v], False)
                    break
                except:
                    time.sleep(1)

    def fs_processing(self, fs):
        global queue2

        for k, v in fs.iteritems():
            k_split = k.split('/')
            while True:
                try:
                    queue2.put(['fs', k_split[0], v], False)
                    break
                except:
                    time.sleep(1)



class RRDWriter():

    def __init__(self, source, archive):
        self.source = source
        self.archive = archive

    def _create_db(self, rrd_db_path):
        if not os.path.exists(os.path.dirname(rrd_db_path)):
            os.makedirs(os.path.dirname(rrd_db_path))
            rrdtool.create(rrd_db_path, self.source, self.archive)

    def write(self, db_path, data):
        '''
        type db_path: string
        param db_path: Path to rrd database directory

        type data: dictionary
        param data: Dictionary {metric name:data} with data to write. Example:
            {'in':111, 'out':222}
        '''
        if not os.path.exists(db_path):
            self._create_db(db_path)
        data_to_write = [data[s.split(':')[1]] for s in self.source]
        val = 'N:' + ':'.join(map(str, data_to_write))
        try:
            LOG.debug('%s %s, %s' %(time.time(), db_path, val))
            rrdtool.update(db_path, "--daemon", "unix:/var/run/rrdcached.sock", val)
        except rrdtool.error, e:
            LOG.error('RRDTool update error:%s, %s' %(e, db_path))


class RRDWorker(object):
    writers = {}
    writers.update({'cpu':RRDWriter(cpu_source, cpu_archive)})
    writers.update({'la':RRDWriter(la_source, la_archive)})
    writers.update({'mem':RRDWriter(mem_source, mem_archive)})
    writers.update({'net':RRDWriter(net_source, net_archive)})
    writers.update({'servers':RRDWriter(servers_num_source, servers_num_archive)})
    writers.update({'io':RRDWriter(io_source, io_archive)})

    def __init__(self):
        RRDWorker.terminate = False

    def _process_server_task(self, rrd_task):
        farm_id = rrd_task[1]
        i = int(str(farm_id)[-1])-1
        x1 = str(i-5*(i/5)+1)[-1]
        x2 = str(i-5*(i/5)+6)[-1]
        farm_role_id = rrd_task[2]
        index = rrd_task[3]
        data = rrd_task[4]
        for metric_group in data:
            if metric_group == 'io':
                for device in data[metric_group]:
                    RRDWorker.writers[metric_group].write(
                            '%s/x%sx%s/%s/INSTANCE_%s_%s/%sSNMP/%s.rrd'\
                            %(RRD_DB_DIR, x1, x2, farm_id, farm_role_id, index,
                            metric_group.upper(), device), data[metric_group][device])
            else:
                RRDWorker.writers[metric_group].write(
                        '%s/x%sx%s/%s/INSTANCE_%s_%s/%sSNMP/db.rrd'\
                        %(RRD_DB_DIR, x1, x2, farm_id, farm_role_id, index,
                        metric_group.upper()), data[metric_group])

    def _process_ra_task(self, rrd_task):
        farm_id = rrd_task[1]
        i = int(str(farm_id)[-1])-1
        x1 = str(i-5*(i/5)+1)[-1]
        x2 = str(i-5*(i/5)+6)[-1]
        farm_role_id = rrd_task[2]
        data = rrd_task[3]
        for metric_group in data:
            RRDWorker.writers[metric_group].write(
                    '%s/x%sx%s/%s/FR_%s/%sSNMP/db.rrd'\
                    %(RRD_DB_DIR, x1, x2, farm_id, farm_role_id,
                    metric_group.upper()), data[metric_group])

    def _process_fa_task(self, rrd_task):
        farm_id = rrd_task[1]
        i = int(str(farm_id)[-1])-1
        x1 = str(i-5*(i/5)+1)[-1]
        x2 = str(i-5*(i/5)+6)[-1]
        data = rrd_task[2]
        for metric_group in data:
            RRDWorker.writers[metric_group].write(
                    '%s/x%sx%s/%s/FARM/%sSNMP/db.rrd'\
                    %(RRD_DB_DIR, x1, x2, farm_id,
                    metric_group.upper()), data[metric_group])

    def _process_rs_task(self, rrd_task):
        farm_id = rrd_task[1]
        i = int(str(farm_id)[-1])-1
        x1 = str(i-5*(i/5)+1)[-1]
        x2 = str(i-5*(i/5)+6)[-1]
        farm_role_id = rrd_task[2]
        data = rrd_task[3]
        for metric_group in data:
            RRDWorker.writers[metric_group].write(
                    '%s/x%sx%s/%s/FR_%s/SERVERS/db.rrd'\
                    %(RRD_DB_DIR, x1, x2, farm_id, farm_role_id), data[metric_group])

    def _process_fs_task(self, rrd_task):
        farm_id = rrd_task[1]
        i = int(str(farm_id)[-1])-1
        x1 = str(i-5*(i/5)+1)[-1]
        x2 = str(i-5*(i/5)+6)[-1]
        data = rrd_task[2]
        for metric_group in data:
            RRDWorker.writers[metric_group].write(
                    '%s/x%sx%s/%s/FARM/SERVERS/db.rrd'\
                    %(RRD_DB_DIR, x1, x2, farm_id), data[metric_group])


    def __call__(self):
        '''
        rrd_task = ['server', farm_id, farm_role_id, index, data]
        '''
        global queue2

        while not RRDWorker.terminate or queue2.qsize() != 0:
            try:
                rrd_task = queue2.get(False)
            except:
                time.sleep(1)
                continue

            task_name = rrd_task[0]

            if task_name == 'done':
                RRDWorker.terminate = True
                break

            if task_name == 'server':
                self._process_server_task(rrd_task)
            elif task_name == 'ra':
                self._process_ra_task(rrd_task)
            elif task_name == 'fa':
                self._process_fa_task(rrd_task)
            elif task_name == 'rs':
                self._process_rs_task(rrd_task)
            elif task_name == 'fs':
                self._process_fs_task(rrd_task)



def configure(args, config):
    global LOG_FILE
    global PID_FILE
    global F_WRK_NUM
    global Q1_WRK_NUM
    global Q2_WRK_NUM
    global RRD_DB_DIR

    if 'farm_workers_num' in config:
        F_WRK_NUM = config['farm_workers_num']

    if 'statistic_workers_num' in config:
        Q1_WRK_NUM = config['statistic_workers_num']

    if 'rrd_workers_num' in config:
        Q2_WRK_NUM = config['rrd_workers_num']

    if 'rrd_db_dir' in config:
        RRD_DB_DIR = config['rrd_db_dir']

    if args.pid:
        PID_FILE = args.pid
    else:
        if 'pid_file' in config:
            PID_FILE = config['pid_file']

    if 'log_file' in config:
        LOG_FILE = config['log_file']

    LOG = logging.getLogger(__file__)
    util.log_config(LOG, args.verbosity, log_file=LOG_FILE, log_size=1024*1000)



def check_pid():
   if os.path.exists(PID_FILE):
       pid = open(PID_FILE).read().strip()
       if os.path.exists('/proc/' + pid):
           LOG.critical('Another copy already running (pid: %s). Exit', pid)
           sys.stderr.write('Another copy already running (pid: %s). Exit\n' %pid)
           sys.exit(0)
   with open(PID_FILE, 'w+') as fp:
       fp.write(str(os.getpid()))



def main():
    try:
        parser = argparse.ArgumentParser()

        parser.add_argument('-i', '--interval', type=int, default=0,
                help="execution interval in seconds. Default is 0 - exec once")
        parser.add_argument('--pid', default=None, help="Pid file")
        parser.add_argument('-m', '--metric', choices=['cpu', 'la', 'mem', 'net', 'io'],
                action='append',
                help="metric type for processing.\
                'io' metric is supported only in a 'scalarizr_api mode'")
        parser.add_argument('-M', '--mode', choices=['snmp', 'scalarizr_api'])
        parser.add_argument('-c', '--config', default=ETC_DIR+'/config.yml',
                help='config file')
        parser.add_argument('-v', '--verbosity',
                action='count',
                default=0,
                help='increase output verbosity [0:4]. default is 0')
        parser.add_argument('--version', action='version', version='Version %s' %__version__)

        args = parser.parse_args()

        try:
            config = yaml.safe_load(open(args.config))['scalr']['stats_poller']
        except:
            sys.stderr.write('Error load config file %s. Exit\n' %args.config)
            sys.exit(1)

        if args.mode:
            mode = args.mode
        elif 'mode' in config:
            mode = config['mode']
        else:
            mode = 'snmp'

        if args.metric:
            metric = args.metric
        elif 'metric' in config:
            metric = config['metric']
        else:
            metric = ['cpu', 'la', 'mem', 'net']

        if mode == 'snmp':
            metric = list(set(metric).intersection(set(['cpu', 'la', 'mem', 'net'])))
        elif mode == 'scalarizr_api':
            metric = list(set(metric).intersection(set(['cpu', 'la', 'mem', 'net', 'io'])))

        configure(args, config)

        check_pid()

        LOG.debug('Start')

        while True:
            start_time = time.time()
            LOG.info('Start time: %s' %time.ctime())
            try:
                scheduler(config['connections']['mysql'], mode, metric)
            except KeyboardInterrupt:
                raise
            except db_exc.OperationalError:
                LOG.error(util.exc_info())
            except:
                LOG.error(util.exc_info())
                raise
            LOG.info('Working time: %s' %(time.time() - start_time))
            if not args.interval:
                break
            sleep_time = start_time + args.interval - time.time()
            if sleep_time > 0:
                time.sleep(sleep_time)

        LOG.debug('Exit')

    except KeyboardInterrupt:
        LOG.critical('KeyboardInterrupt')
        sys.exit(0)
    except SystemExit:
        pass
    except:
        LOG.critical(util.exc_info())
        sys.exit(1)


if __name__ == '__main__':
    main()
