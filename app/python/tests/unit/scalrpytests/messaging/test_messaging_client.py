
import mock
import time
import unittest
import gearman

from scalrpy.messaging import messaging_client


class MessagingClientTest(unittest.TestCase):

    def test_init(self):
        cli = messaging_client.MessagingClient({'connections':{
                'gearman':{'servers':['localhost', '127.0.0.1']}}})
        assert cli.config == {'connections':{'gearman':{
                'servers':['localhost', '127.0.0.1']}}}

    def test_set_new_gm_server(self):
        # ok
        with mock.patch('gearman.GearmanAdminClient') as gmAdmCliMock:
            instance = gmAdmCliMock.return_value
            instance.ping_server.return_value = 1
            instance.send_maxqueue.return_value = True

            cli = messaging_client.MessagingClient({'connections':{
                    'gearman':{'servers':['localhost', '127.0.0.1']}}})

            cli._set_new_gm_server()
            assert cli.gm_host == 'localhost'
            cli._set_new_gm_server()
            assert cli.gm_host == '127.0.0.1'
            cli._set_new_gm_server()
            assert cli.gm_host == 'localhost'

        # error
        with mock.patch('gearman.GearmanAdminClient') as gmAdmCliMock:
            instance = gmAdmCliMock.return_value
            instance.ping_server.side_effect = gearman.errors.ServerUnavailable
            instance.send_maxqueue.side_effect = gearman.errors.ServerUnavailable

            cli = messaging_client.MessagingClient({'connections':{
                    'gearman':{'servers':['localhost', '127.0.0.1']}}})

            self.assertRaises(gearman.errors.ServerUnavailable, cli._set_new_gm_server)
            assert cli.gm_host == None


    '''
    def test_submit_message(self):
        # ok
        cli = messaging_client.MessagingClient({'connections':{
                'gearman':{'servers':['localhost', '127.0.0.1']}}})

        cli.gm_client = mock.Mock()
        cli.gm_client.submit_job = mock.Mock(return_value='ok')
        req = cli._submit_message('1'*75)

        assert req == 'ok'

        cli.gm_client.submit_job.assert_called_once_with(
                'message.send', '1'*75, unique='1'*64, wait_until_complete=False)

        # error
        cli = messaging_client.MessagingClient({'connections':{
                'gearman':{'servers':['localhost', '127.0.0.1']}}})

        cli.gm_client = mock.Mock()
        cli.gm_client.submit_job = mock.Mock(side_effect=gearman.errors.ServerUnavailable)

        self.assertRaises(gearman.errors.ServerUnavailable, cli._submit_message, '1'*75)
    '''


    def test_update_submitted_jobs(self):
        cli = messaging_client.MessagingClient({'connections':{
                'gearman':{'servers':['localhost', '127.0.0.1']}}})

        t = int(time.time())
        cli.submitted_jobs = {'id1':('req1', t-1), 'id2':('req2', t+30)}

        cli._update_submitted_jobs()
        print cli.submitted_jobs
        assert cli.submitted_jobs == {'id2':('req2', t+30)}



def test_configure():
    args = mock.Mock()
    args.verbosity = 0
    config = {'pid_file':'abcd'}
    messaging_client.configure(args, config)
    args.verbosity = 1
    config = {'log_file':'abcd'}
    messaging_client.configure(args, config)
    args.verbosity = 2
    config = {'cratio':120}
    messaging_client.configure(args, config)
    args.verbosity = 3
    messaging_client.configure(args, config)
    args.verbosity = 4
    messaging_client.configure(args, config)
    args.verbosity = 9
    messaging_client.configure(args, config)
