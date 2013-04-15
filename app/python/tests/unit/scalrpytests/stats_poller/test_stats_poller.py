
import unittest
import mock
import sys
import os
import multiprocessing
import Queue

from scalrpy.stats_poller import stats_poller



def patch_snmp_strategy():
    strategy = stats_poller.SNMPStrategy()
    strategy.get_data = mock.Mock(return_value = {
            'cpu':{
                    'user':1,
                    'nice':1,
                    'system':1,
                    'idle':1},
            'la':{
                    'la1':1.0,
                    'la5':1.0,
                    'la15':1.0},
            'mem':{
                    'swap':1,
                    'swapavail':1,
                    'total':1,
                    'avail':1,
                    'free':1,
                    'shared':1,
                    'buffer':1,
                    'cached':1},
            'net':{
                    'in':1,
                    'out':1}})
    return strategy



def patch_scalarizr_api_strategy():
    strategy = stats_poller.ScalarizrAPIStrategy()
    strategy.get_data = mock.Mock(return_value = {
            'cpu':{
                    'user':1,
                    'nice':1,
                    'system':1,
                    'idle':1},
            'la':{
                    'la1':1.0,
                    'la5':1.0,
                    'la15':1.0},
            'mem':{
                    'swap':1,
                    'swapavail':1,
                    'total':1,
                    'avail':1,
                    'free':1,
                    'shared':1,
                    'buffer':1,
                    'cached':1},
            'net':{
                    'in':1,
                    'out':1},
            'io':{
                    'xz1':1,
                    'xz2':1}})
    return strategy



class SNMPStrategyTest(unittest.TestCase):

    @mock.patch('scalrpy.stats_poller.stats_poller.netsnmp')
    def test_get_data(self, netsnmp):
        connection_info = ['localhost', 161, 'YaOtBabuhkiYhelYaOtDeduhkiYhel']
        with mock.patch('scalrpy.stats_poller.stats_poller.netsnmp.Session') as Session:
            instance = Session.return_value
            instance.get.return_value = (
                '0', '0', '0', '0', '0.0', '0.0', '0.0','0',
                '0', '0', '0', '0', '0', '0', '0', '0', '0')
            strategy = stats_poller.SNMPStrategy()
            data = strategy.get_data(connection_info, ['cpu', 'la', 'mem', 'net'])
            assert data == {
                    'cpu':{
                            'user':0,
                            'nice':0,
                            'system':0,
                            'idle':0},
                    'la':{
                            'la1':0.0,
                            'la5':0.0,
                            'la15':0.0},
                    'mem':{
                            'swap':0,
                            'swapavail':0,
                            'total':0,
                            'avail':0,
                            'free':0,
                            'shared':0,
                            'buffer':0,
                            'cached':0},
                    'net':{
                            'in':0,
                            'out':0}}



class ScalarizrAPIStrategyTest(unittest.TestCase):

    def test_get_data(self):
        connection_info = ['localhost', 8010, 'YaOtBabuhkiYhelYaOtDeduhkiYhel']
        with mock.patch('scalrpy.stats_poller.stats_poller.HttpServiceProxy') as HttpServiceProxy:
            hsp = HttpServiceProxy.return_value
            hsp.sysinfo.cpu_stat.return_value = {'user':0, 'nice':0, 'system':0, 'idle':0}
            hsp.sysinfo.mem_info.return_value = {
                    'total_swap':0,
                    'avail_swap':0,
                    'total_real':0,
                    'total_free':0,
                    'shared':0,
                    'buffer':0,
                    'cached':0}
            hsp.sysinfo.net_stats.return_value = {
                    'eth0':{'receive':{'bytes':0}, 'transmit':{'bytes':0}}}
            hsp.sysinfo.load_average.return_value = [0.0, 0.0, 0.0]
            hsp.sysinfo.disk_stats.return_value = {
                'xvda1':{
                        'write':{
                                'num':0,
                                'bytes':0,
                                'sectors':0},
                        'read':{
                                'num':0,
                                'bytes':0,
                                'sectors':0}},
                'loop0':{
                        'write':{
                                'num':0,
                                'bytes':0,
                                'sectors':0},
                        'read':{
                                'num':0,
                                'bytes':0,
                                'sectors':0}}}
            strategy = stats_poller.ScalarizrAPIStrategy()
            data = strategy.get_data(connection_info, ['cpu', 'la', 'mem', 'net', 'io'])
            assert data == {
                    'cpu':{
                            'user':0,
                            'nice':0,
                            'system':0,
                            'idle':0},
                    'la':{
                            'la1':0.0,
                            'la5':0.0,
                            'la15':0.0},
                    'mem':{
                            'swap':0,
                            'swapavail':0,
                            'total':0,
                            'avail':0,
                            'free':0,
                            'shared':0,
                            'buffer':0,
                            'cached':0},
                    'net':{
                            'in':0,
                            'out':0},
                    'io':{
                            'xvda1':{
                                    'read':0,
                                    'write':0,
                                    'rbyte':0,
                                    'wbyte':0},
                            'loop0':{
                                    'read':0,
                                    'write':0,
                                    'rbyte':0,
                                    'wbyte':0}}}



class StatisticWorkerTest(unittest.TestCase):

    def setUp(self):
        stats_poller.farm_queue = multiprocessing.Queue(100)
        stats_poller.queue1 = Queue.Queue(100)
        stats_poller.queue2 = Queue.Queue(100)

    def test_work_snmp_mode(self):
        strategy = patch_snmp_strategy()

        stats_poller.queue1.put(['server', 1, 1, 1, ['localhost', 161, 'abcde']])
        stats_poller.queue1.put(['done'])

        wrk = stats_poller.StatisticWorker(strategy, {}, {})
        wrk(['cpu', 'la', 'mem', 'net'])
        assert stats_poller.queue2.get() == ['server', 1, 1, 1, {'mem': {
                'avail': 1, 'cached': 1, 'total': 1, 'swap': 1, 'buffer': 1,
                'shared': 1, 'swapavail': 1, 'free': 1}, 'net': {'out': 1, 'in': 1},
                'cpu': {'system': 1, 'idle': 1, 'user': 1, 'nice': 1}, 'la': {
                'la5': 1.0, 'la15': 1.0, 'la1': 1.0}}]

    def test_work_scalrizr_api_mode(self):
        strategy = patch_scalarizr_api_strategy()

        stats_poller.queue1.put(['server', 1, 1, 1, ['localhost', 161, 'abcde']])
        stats_poller.queue1.put(['done'])

        wrk = stats_poller.StatisticWorker(strategy, {}, {})
        wrk(['cpu', 'la', 'mem', 'net', 'io'])
        assert stats_poller.queue2.get() == ['server', 1, 1, 1, {'mem':
                {'avail': 1, 'cached': 1, 'total': 1, 'swap': 1,
                'buffer': 1, 'shared': 1, 'swapavail': 1, 'free': 1},
                'net': {'out': 1, 'in': 1}, 'cpu': {'system': 1, 'idle': 1,
                'user': 1, 'nice': 1}, 'io': {'xz1': 1, 'xz2': 1}, 'la': {
                'la5': 1.0, 'la15': 1.0, 'la1': 1.0}}]



class FarmWorkerTest(unittest.TestCase):

    def setUp(self):
        stats_poller.farm_queue = multiprocessing.Queue(100)
        stats_poller.queue1 = Queue.Queue(100)
        stats_poller.queue2 = Queue.Queue(100)

    def test_ra_processing(self):
        stats_poller.queue1.put(['server', 1, 1, 1, ['localhost', 161, 'abcde']])
        stats_poller.queue1.put(['server', 1, 1, 2, ['localhost', 161, 'abcde']])
        stats_poller.queue1.put(['server', 1, 2, 1, ['localhost', 161, 'abcde']])
        stats_poller.queue1.put(['server', 1, 2, 2, ['localhost', 161, 'abcde']])
        stats_poller.queue1.put(['server', 2, 1, 1, ['localhost', 161, 'abcde']])
        stats_poller.queue1.put(['server', 2, 2, 1, ['localhost', 161, 'abcde']])
        stats_poller.queue1.put(['done'])

        strategy = patch_snmp_strategy()
        ra = {}
        fa = {}
        wrk = stats_poller.StatisticWorker(strategy, ra, fa)
        wrk(['cpu', 'la', 'mem', 'net'])

        assert ra == {1: {1: {'mem': {'swapavail': [2, 2], 'cached': [2, 2], 'free': [2, 2],
                'avail': [2, 2], 'buffer': [2, 2], 'swap': [2, 2], 'shared': [2, 2],
                'total': [2, 2]}, 'net': {'in': [2, 2], 'out': [2, 2]}, 'cpu': {'idle': [2, 2],
                'nice': [2, 2], 'system': [2, 2], 'user': [2, 2]}, 'la': {'la5': [2, 2.0],
                'la15': [2, 2.0], 'la1': [2, 2.0]}}, 2: {'mem': {'swapavail': [2, 2],
                'cached': [2, 2], 'free': [2, 2], 'avail': [2, 2], 'buffer': [2, 2],
                'swap': [2, 2], 'shared': [2, 2], 'total': [2, 2]}, 'net': {'in': [2, 2],
                'out': [2, 2]}, 'cpu': {'idle': [2, 2], 'nice': [2, 2], 'system': [2, 2],
                'user': [2, 2]}, 'la': {'la5': [2, 2.0], 'la15': [2, 2.0],
                'la1': [2, 2.0]}}},2: {1: {'mem': {'swapavail': [1, 1], 'cached': [1, 1],
                'free': [1, 1], 'avail': [1, 1], 'buffer': [1, 1], 'swap': [1, 1],
                'shared': [1, 1], 'total': [1, 1]}, 'net': {'in': [1, 1], 'out': [1, 1]},
                'cpu': {'idle': [1, 1], 'nice': [1, 1], 'system': [1, 1], 'user': [1, 1]},
                'la': {'la5': [1, 1.0], 'la15': [1, 1.0], 'la1': [1, 1.0]}}, 2: {
                'mem': {'swapavail': [1, 1], 'cached': [1, 1], 'free': [1, 1], 'avail': [1, 1],
                'buffer': [1, 1], 'swap': [1, 1], 'shared': [1, 1], 'total': [1, 1]},
                'net': {'in': [1, 1], 'out': [1, 1]}, 'cpu': {'idle': [1, 1], 'nice': [1, 1],
                'system': [1, 1], 'user': [1, 1]}, 'la': {'la5': [1, 1.0], 'la15': [1, 1.0],
                'la1': [1, 1.0]}}}}

    def test_fa_processing(self):
        stats_poller.queue1.put(['server', 1, 1, 1, ['localhost', 161, 'abcde']])
        stats_poller.queue1.put(['server', 1, 1, 2, ['localhost', 161, 'abcde']])
        stats_poller.queue1.put(['server', 1, 2, 1, ['localhost', 161, 'abcde']])
        stats_poller.queue1.put(['server', 1, 2, 2, ['localhost', 161, 'abcde']])
        stats_poller.queue1.put(['server', 2, 1, 1, ['localhost', 161, 'abcde']])
        stats_poller.queue1.put(['server', 2, 2, 1, ['localhost', 161, 'abcde']])
        stats_poller.queue1.put(['done'])

        strategy = patch_snmp_strategy()
        ra = {}
        fa = {}
        wrk = stats_poller.StatisticWorker(strategy, ra, fa)
        wrk(['cpu', 'la', 'mem', 'net'])

        assert fa == {1: {'mem': {'swapavail': [4, 4], 'cached': [4, 4], 'free': [4, 4],
                'avail': [4, 4], 'buffer': [4, 4], 'swap': [4, 4], 'shared': [4, 4],
                'total': [4, 4]}, 'net': {'in': [4, 4], 'out': [4, 4]}, 'cpu': {'idle': [4, 4],
                'nice': [4, 4], 'system': [4, 4], 'user': [4, 4]}, 'la': {'la5': [4, 4.0],
                'la15': [4, 4.0], 'la1': [4, 4.0]}}, 2: {'mem': {'swapavail': [2, 2],
                'cached': [2, 2], 'free': [2, 2], 'avail': [2, 2], 'buffer': [2, 2],
                'swap': [2, 2], 'shared': [2, 2], 'total': [2, 2]}, 'net': {'in': [2, 2],
                'out': [2, 2]}, 'cpu': {'idle': [2, 2], 'nice': [2, 2], 'system': [2, 2],
                'user': [2, 2]}, 'la': {'la5': [2, 2.0], 'la15': [2, 2.0], 'la1': [2, 2.0]}}}



class RRDWriterTest(unittest.TestCase):

    # todo
    def test_create_db(self):
        pass

    @mock.patch('scalrpy.stats_poller.stats_poller.rrdtool')
    @mock.patch('scalrpy.stats_poller.stats_poller.os')
    def test_write(self, os, rrdtool):
        writer = stats_poller.RRDWriter(stats_poller.net_source, stats_poller.net_archive)
        writer.write('/tmp/unittest', {'in':1, 'out':1})
        rrdtool.update.assert_called_with('/tmp/unittest', '--daemon',
                'unix:/var/run/rrdcached.sock', 'N:1:1')



class RRDWorkerTest(unittest.TestCase):

    def setUp(self):
        stats_poller.farm_queue = multiprocessing.Queue(100)
        stats_poller.queue1 = Queue.Queue(100)
        stats_poller.queue2 = Queue.Queue(100)

        self.rrd_wrk = stats_poller.RRDWorker()
        self.rrd_wrk.writers['cpu'] = mock.Mock()
        self.rrd_wrk.writers['net'] = mock.Mock()
        self.rrd_wrk.writers['mem'] = mock.Mock()
        self.rrd_wrk.writers['la'] = mock.Mock()
        self.rrd_wrk.writers['servers'] = mock.Mock()
        self.rrd_wrk.writers['io'] = mock.Mock()


    def test_process_server_task(self):
        rrd_task = ['server', 1, 1, 1, {
                'cpu':{
                    'user':1,
                    'system':1,
                    'nice':1,
                    'idle':1},
                'mem':{
                    'swap':1,
                    'swapavail':1,
                    'total':1,
                    'avail':1,
                    'free':1,
                    'shared':1,
                    'buffer':1,
                    'cached':1},
                'la':{
                    'la1':1.0,
                    'la5':1.0,
                    'la15':1.0},
                'net':{
                    'in':1,'out':1},
                'io':{
                    'xvda1':{
                        'read':1,
                        'write':1,
                        'rbyte':1,
                        'wbyte':1},
                    'loop0':{
                        'read':1,
                        'write':1,
                        'rbyte':1,
                        'wbyte':1}}}]

        self.rrd_wrk._process_server_task(rrd_task)

        self.rrd_wrk.writers['cpu'].write.assert_called_with(
                '/tmp/rrd_db_dir/x1x6/1/INSTANCE_1_1/CPUSNMP/db.rrd',
                {'user':1, 'system':1, 'nice':1, 'idle':1})
        self.rrd_wrk.writers['mem'].write.assert_called_with(
                '/tmp/rrd_db_dir/x1x6/1/INSTANCE_1_1/MEMSNMP/db.rrd',
                {'swap':1, 'swapavail':1, 'total':1, 'avail':1, 'free':1,
                'shared':1, 'buffer':1, 'cached':1})
        self.rrd_wrk.writers['net'].write.assert_called_with(
                '/tmp/rrd_db_dir/x1x6/1/INSTANCE_1_1/NETSNMP/db.rrd',
                {'in':1, 'out':1})
        self.rrd_wrk.writers['la'].write.assert_called_with(
                '/tmp/rrd_db_dir/x1x6/1/INSTANCE_1_1/LASNMP/db.rrd',
                {'la1':1.0, 'la5':1.0, 'la15':1.0})
        assert self.rrd_wrk.writers['io'].write.call_args_list == [
                mock.call('/tmp/rrd_db_dir/x1x6/1/INSTANCE_1_1/IOSNMP/loop0.rrd',
                {'read': 1, 'write': 1, 'wbyte': 1, 'rbyte': 1}),
                mock.call('/tmp/rrd_db_dir/x1x6/1/INSTANCE_1_1/IOSNMP/xvda1.rrd',
                {'read': 1, 'write': 1, 'wbyte': 1, 'rbyte': 1})]

    def test_process_ra_task(self):
        rrd_task = ['ra', 1, 1, {
                'cpu':{
                    'user':1,
                    'system':1,
                    'nice':1,
                    'idle':1},
                'mem':{
                    'swap':1,
                    'swapavail':1,
                    'total':1,
                    'avail':1,
                    'free':1,
                    'shared':1,
                    'buffer':1,
                    'cached':1},
                'la':{
                    'la1':1.0,
                    'la5':1.0,
                    'la15':1.0},
                'net':{
                    'in':1,'out':1}}]

        self.rrd_wrk._process_ra_task(rrd_task)

        self.rrd_wrk.writers['cpu'].write.assert_called_with(
                '/tmp/rrd_db_dir/x1x6/1/FR_1/CPUSNMP/db.rrd',
                {'user':1, 'system':1, 'nice':1, 'idle':1})
        self.rrd_wrk.writers['mem'].write.assert_called_with(
                '/tmp/rrd_db_dir/x1x6/1/FR_1/MEMSNMP/db.rrd',
                {'swap':1, 'swapavail':1, 'total':1, 'avail':1, 'free':1,
                'shared':1, 'buffer':1, 'cached':1})
        self.rrd_wrk.writers['net'].write.assert_called_with(
                '/tmp/rrd_db_dir/x1x6/1/FR_1/NETSNMP/db.rrd',
                {'in':1, 'out':1})
        self.rrd_wrk.writers['la'].write.assert_called_with(
                '/tmp/rrd_db_dir/x1x6/1/FR_1/LASNMP/db.rrd',
                {'la1':1.0, 'la5':1.0, 'la15':1.0})

    def test_process_fa_task(self):
        rrd_task = ['fa', 1, {
                'cpu':{
                    'user':1,
                    'system':1,
                    'nice':1,
                    'idle':1},
                'mem':{
                    'swap':1,
                    'swapavail':1,
                    'total':1,
                    'avail':1,
                    'free':1,
                    'shared':1,
                    'buffer':1,
                    'cached':1},
                'la':{
                    'la1':1.0,
                    'la5':1.0,
                    'la15':1.0},
                'net':{
                    'in':1,'out':1}}]

        self.rrd_wrk._process_fa_task(rrd_task)

        self.rrd_wrk.writers['cpu'].write.assert_called_with(
                '/tmp/rrd_db_dir/x1x6/1/FARM/CPUSNMP/db.rrd',
                {'user':1, 'system':1, 'nice':1, 'idle':1})
        self.rrd_wrk.writers['mem'].write.assert_called_with(
                '/tmp/rrd_db_dir/x1x6/1/FARM/MEMSNMP/db.rrd',
                {'swap':1, 'swapavail':1, 'total':1, 'avail':1, 'free':1,
                'shared':1, 'buffer':1, 'cached':1})
        self.rrd_wrk.writers['net'].write.assert_called_with(
                '/tmp/rrd_db_dir/x1x6/1/FARM/NETSNMP/db.rrd',
                {'in':1, 'out':1})
        self.rrd_wrk.writers['la'].write.assert_called_with(
                '/tmp/rrd_db_dir/x1x6/1/FARM/LASNMP/db.rrd',
                {'la1':1.0, 'la5':1.0, 'la15':1.0})

    def test_process_rs_task(self):
        rrd_task = ['rs', 1, 1, {
                'servers':{
                        's_running':1}}]

        self.rrd_wrk._process_rs_task(rrd_task)

        self.rrd_wrk.writers['servers'].write.assert_called_with(
                '/tmp/rrd_db_dir/x1x6/1/FR_1/SERVERS/db.rrd',
                {'s_running':1})

    def test_process_fs_task(self):
        rrd_task = ['fs', 1, {
                'servers':{
                        's_running':1}}]

        self.rrd_wrk._process_fs_task(rrd_task)

        self.rrd_wrk.writers['servers'].write.assert_called_with(
                '/tmp/rrd_db_dir/x1x6/1/FARM/SERVERS/db.rrd',
                {'s_running':1})

    def test_call(self):
        stats_poller.queue2.put(['server', 1, 1, 1, {'cpu':{
                'user':1,
                'system':1,
                'nice':1,
                'idle':1}}])
        stats_poller.queue2.put(['done'])
        self.rrd_wrk()
        self.rrd_wrk.writers['cpu'].write.assert_called_with(
                '/tmp/rrd_db_dir/x1x6/1/INSTANCE_1_1/CPUSNMP/db.rrd',
                {'user':1, 'system':1, 'nice':1, 'idle':1})

        stats_poller.queue2.put(['server', 1, 1, 1, {'mem':{
                'swap':1,
                'swapavail':1,
                'total':1,
                'avail':1,
                'free':1,
                'shared':1,
                'buffer':1,
                'cached':1}}])
        stats_poller.queue2.put(['done'])
        self.rrd_wrk()
        self.rrd_wrk.writers['mem'].write.assert_called_with(
                '/tmp/rrd_db_dir/x1x6/1/INSTANCE_1_1/MEMSNMP/db.rrd',
                {'swap':1, 'swapavail':1, 'total':1, 'avail':1, 'free':1,
                'shared':1, 'buffer':1, 'cached':1})

        stats_poller.queue2.put(['server', 1, 1, 1, {'la':{'la1':1, 'la5':1, 'la15':1}}])
        stats_poller.queue2.put(['done'])
        self.rrd_wrk()
        self.rrd_wrk.writers['la'].write.assert_called_with(
                '/tmp/rrd_db_dir/x1x6/1/INSTANCE_1_1/LASNMP/db.rrd',
                {'la1':1, 'la5':1, 'la15':1})

        stats_poller.queue2.put(['server', 1, 1, 1, {'net':{'in':1, 'out':1}}])
        stats_poller.queue2.put(['done'])
        self.rrd_wrk()
        self.rrd_wrk.writers['net'].write.assert_called_with(
                '/tmp/rrd_db_dir/x1x6/1/INSTANCE_1_1/NETSNMP/db.rrd',
                {'in':1, 'out':1})

        stats_poller.queue2.put(['ra', 1, 1, {'net':{'in':1, 'out':1}}])
        stats_poller.queue2.put(['done'])
        self.rrd_wrk()
        self.rrd_wrk.writers['net'].write.assert_called_with(
                '/tmp/rrd_db_dir/x1x6/1/FR_1/NETSNMP/db.rrd',
                {'in':1, 'out':1})

        stats_poller.queue2.put(['fa', 1, {'net':{'in':1, 'out':1}}])
        stats_poller.queue2.put(['done'])
        self.rrd_wrk()
        self.rrd_wrk.writers['net'].write.assert_called_with(
                '/tmp/rrd_db_dir/x1x6/1/FARM/NETSNMP/db.rrd',
                {'in':1, 'out':1})



if __name__ == "__main__":
	main()
	unittest.main()
