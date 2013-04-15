
import unittest
import mock
import sys
import os

from scalrpy.util import DBManager


class DBManagerTest(unittest.TestCase):

    def test_init(self):
        config = {
                'user':'user',
                'pass':'pass',
                'host':'localhost',
                'name':'scalr',
                'driver':'mysql+pymysql',
                'pool_recycle':120,
                'pool_size':4}
        db_manager = DBManager(config)
        assert db_manager.connection == 'mysql+pymysql://user:pass@localhost/scalr'
        assert db_manager.kwargs == {'pool_recycle':120, 'pool_size':4}

        db = db_manager.get_db()
        assert db is not None
        assert db_manager.db is not None



if __name__ == "__main__":
	main()
	unittest.main()
