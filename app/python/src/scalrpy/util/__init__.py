
import os
import sys
import logging
import logging.handlers
import sqlsoup
import sqlalchemy
import traceback

from urllib import quote_plus

from sqlalchemy.orm import sessionmaker
from sqlalchemy.orm import scoped_session



def log_config(LOG, log_level, log_file=None, log_size=1024*100):
    lvl = {0:logging.CRITICAL, 1:logging.ERROR, 2:logging.WARNING, 3:logging.INFO, 4:logging.DEBUG}

    if log_level not in range(5):
        sys.stderr.write('Wrong logging level. Set default(CRITICAL)\n')
        log_level = 0

    LOG.setLevel(lvl[log_level])
    frmtr= logging.Formatter('%(asctime)s-%(name)s-%(levelname)s# %(message)s')

    if log_file:
        hndlr = logging.handlers.RotatingFileHandler(log_file, mode='a', maxBytes=log_size)
    else:
        hndlr = logging.StreamHandler(sys.stderr)

    hndlr.setLevel(lvl[log_level])
    hndlr.setFormatter(frmtr)
    LOG.addHandler(hndlr)



# TODO
def exc_info():
    exc_type, exc_obj, exc_tb = sys.exc_info()
    fname = os.path.split(exc_tb.tb_frame.f_code.co_filename)[1]      
    return '%s, %s, %s, line: %s' % (exc_type, exc_obj, fname, traceback.tb_lineno(exc_tb))



def check_pid(pid_file, LOG=None):
    if os.path.exists(pid_file):
        pid = open(pid_file).read().strip()
        if os.path.exists('/proc/' + pid):
            sys.stderr.write('Another copy already running (pid: %s). Exit\n' % pid)
            if LOG:
                LOG.critical('Another copy already running (pid: %s). Exit' % pid)
            sys.exit(0)
    with open(pid_file, 'w+') as fp:
        fp.write(str(os.getpid()))



class DBManager(object):
    """Database manager class"""

    def __init__(self, config):
        '''
        :type config: dictionary
        :param config: Database connection info. Example:
            {
                'user':'user',
                'pass':'pass',
                'host':'localhost',
                'name':'scalr',
                'driver':'mysql+pymysql',
                'pool_recycle':120,
                'pool_size':4}
        '''
        self.db = None
        self.connection = '%s://%s:%s@%s/%s' % (
                    config['driver'],    
                    config['user'],      
                    quote_plus(config['pass']),      
                    config['host'],
                    config['name'])
        self.kwargs = dict((k, v) for (k, v) in config.iteritems()\
                          if k not in ('user', 'pass', 'host', 'name', 'driver'))

    def get_db(self):
        if not self.db:
            self.db_engine = sqlalchemy.create_engine(self.connection, **self.kwargs)
            self.db = sqlsoup.SQLSoup(self.db_engine,
                    session=scoped_session(sessionmaker(bind=self.db_engine)))
        return self.db
