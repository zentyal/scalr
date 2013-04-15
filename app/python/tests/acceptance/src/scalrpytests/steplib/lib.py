
import sys
import time
import sqlalchemy

from urllib import quote_plus

from scalrpy import util
from sqlalchemy import exc as sql_exc
from sqlalchemy.orm import sessionmaker
from sqlalchemy.orm import scoped_session


def wait_sec(sec):
    time.sleep(sec)
    ret = True


def drop_db(config):
    try:
        db_manager = util.DBManager(config)
        db = db_manager.get_db()

        db.session.connection().execute('commit')
        db.session.connection().execute('drop database %s' %config['name'])
        db.session.connection().execute('commit')
        db.session.connection().close()
        ret = True
    except sql_exc.InternalError as e:
        if e.orig[0] == 1049:
            ret = True
        else:
            print sys.exc_info()
            ret = False
    except:
        print sys.exc_info()
        ret = False
    return ret


def create_db(config):
    try:
        db_manager = util.DBManager(config)
        db = db_manager.get_db()
        db.session.connection()
        db.session.close()
        ret = True
    except:
        try:
            db_engine = sqlalchemy.create_engine('%s://%s:%s@%s'
                    %(config['driver'], config['user'],
                    config['pass'], config['host']))
            conn = db_engine.connect()
            conn.execute('commit')
            conn.execute('create database %s' %config['name'])
            conn.execute('commit')
            conn.close()
            ret = True
        except:
            print sys.exc_info()
            ret = False
    return ret


def create_clients_table(config):
    try:
        db_manager = util.DBManager(config)
        db = db_manager.get_db()
        db.session.connection().execute('commit')
        try:
            db.session.connection().execute("CREATE TABLE `clients` ("+\
                "`id` int(11) NOT NULL AUTO_INCREMENT,"+\
                "`name` varchar(255) DEFAULT NULL,"+\
                "`status` varchar(50) DEFAULT NULL,"+\
                "`isbilled` tinyint(1) DEFAULT '0',"+\
                "`dtdue` datetime DEFAULT NULL,"+\
                "`isactive` tinyint(1) DEFAULT '0',"+\
                "`fullname` varchar(60) DEFAULT NULL,"+\
                "`org` varchar(60) DEFAULT NULL,"+\
                "`country` varchar(60) DEFAULT NULL,"+\
                "`state` varchar(60) DEFAULT NULL,"+\
                "`city` varchar(60) DEFAULT NULL,"+\
                "`zipcode` varchar(60) DEFAULT NULL,"+\
                "`address1` varchar(60) DEFAULT NULL,"+\
                "`address2` varchar(60) DEFAULT NULL,"+\
                "`phone` varchar(60) DEFAULT NULL,"+\
                "`fax` varchar(60) DEFAULT NULL,"+\
                "`dtadded` datetime DEFAULT NULL,"+\
                "`iswelcomemailsent` tinyint(1) DEFAULT '0',"+\
                "`login_attempts` int(5) DEFAULT '0',"+\
                "`dtlastloginattempt` datetime DEFAULT NULL,"+\
                "`comments` text,"+\
                "`priority` int(4) NOT NULL DEFAULT '0',"+\
                "PRIMARY KEY (`id`)) "+\
                "ENGINE=InnoDB AUTO_INCREMENT=9587 DEFAULT CHARSET=latin1")
            db.session.connection().execute('commit')
            db.session.connection().close()
            ret = True
        except sql_exc.InternalError as e:
            print sys.exc_info()
            if e.orig[0] == 1050:
                ret = True
            else:
                print sys.exc_info()
                ret = False
    except:
        print sys.exc_info()
        ret = False
    return ret


def create_farms_table(config):
    try:
        db_manager = util.DBManager(config)
        db = db_manager.get_db()
        db.session.connection().execute('commit')
        try:
            db.session.connection().execute("CREATE TABLE `farms` ("+\
                    "`id` int(11) NOT NULL AUTO_INCREMENT,"+\
                    "`clientid` int(11) DEFAULT NULL,"+\
                    "`env_id` int(11) NOT NULL,"+\
                    "`name` varchar(255) DEFAULT NULL,"+\
                    "`iscompleted` tinyint(1) DEFAULT '0',"+\
                    "`hash` varchar(25) DEFAULT NULL,"+\
                    "`dtadded` datetime DEFAULT NULL,"+\
                    "`status` tinyint(1) DEFAULT '1',"+\
                    "`dtlaunched` datetime DEFAULT NULL,"+\
                    "`term_on_sync_fail` tinyint(1) DEFAULT '1',"+\
                    "`region` varchar(255) DEFAULT 'us-east-1',"+\
                    "`farm_roles_launch_order` tinyint(1) DEFAULT '0',"+\
                    "`comments` text,"+\
                    "`created_by_id` int(11) DEFAULT NULL,"+\
                    "`created_by_email` varchar(250) DEFAULT NULL,"+\
                    "PRIMARY KEY (`id`),"+\
                    "KEY `clientid` (`clientid`),"+\
                    "KEY `env_id` (`env_id`),"+\
                    "CONSTRAINT `farms_ibfk_1` FOREIGN KEY (`clientid`) "+\
                    "REFERENCES `clients` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION) "+\
                    "ENGINE=InnoDB AUTO_INCREMENT=12552 DEFAULT CHARSET=latin1") 
            db.session.connection().execute('commit')
            db.session.connection().close()
            ret = True
        except sql_exc.InternalError as e:
            print sys.exc_info()
            if e.orig[0] == 1050:
                ret = True
            else:
                print sys.exc_info()
                ret = False
    except:
        print sys.exc_info()
        ret = False
    return ret


def create_farm_roles_table(config):
    try:
        db_manager = util.DBManager(config)
        db = db_manager.get_db()
        db.session.connection().execute('commit')
        try:
            db.session.connection().execute("CREATE TABLE `farm_roles` ("+\
                    "`id` int(11) NOT NULL AUTO_INCREMENT,"+\
                    "`farmid` int(11) DEFAULT NULL,"+\
                    "`dtlastsync` datetime DEFAULT NULL,"+\
                    "`reboot_timeout` int(10) DEFAULT '300',"+\
                    "`launch_timeout` int(10) DEFAULT '300',"+\
                    "`status_timeout` int(10) DEFAULT '20',"+\
                    "`launch_index` int(5) DEFAULT '0',"+\
                    "`role_id` int(11) DEFAULT NULL,"+\
                    "`new_role_id` int(11) DEFAULT NULL,"+\
                    "`platform` varchar(20) DEFAULT NULL,"+\
                    "`cloud_location` varchar(50) DEFAULT NULL,"+\
                    "PRIMARY KEY (`id`),"+\
                    "KEY `role_id` (`role_id`),"+\
                    "KEY `farmid` (`farmid`),"+\
                    "KEY `platform` (`platform`),"+\
                    "CONSTRAINT `farm_roles_ibfk_1` FOREIGN KEY (`farmid`) "+\
                    "REFERENCES `farms` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION )"+\
                    "ENGINE=InnoDB AUTO_INCREMENT=43156 DEFAULT CHARSET=latin1")
            db.session.connection().execute('commit')
            db.session.connection().close()
            ret = True
        except sql_exc.InternalError as e:
            print sys.exc_info()
            if e.orig[0] == 1050:
                ret = True
            else:
                print sys.exc_info()
                ret = False
    except:
        print sys.exc_info()
        ret = False
    return ret


def create_messages_table(config):
    try:
        db_manager = util.DBManager(config)
        db = db_manager.get_db()
        db.session.connection().execute('commit')
        try:
            db.session.connection().execute("CREATE TABLE `messages` ("+\
                    "`id` int(11) NOT NULL AUTO_INCREMENT,"+\
                    "`messageid` varchar(75) DEFAULT NULL,"+\
                    "`instance_id` varchar(15) DEFAULT NULL,"+\
                    "`status` tinyint(1) DEFAULT '0',"+\
                    "`handle_attempts` int(2) DEFAULT '1',"+\
                    "`dtlasthandleattempt` datetime DEFAULT NULL,"+\
                    "`lock_time` datetime DEFAULT NULL,"+\
                    "`message` longtext,"+\
                    "`server_id` varchar(36) DEFAULT NULL,"+\
                    "`type` enum('in','out') DEFAULT NULL,"+\
                    "`isszr` tinyint(1) DEFAULT '0',"+\
                    "`message_name` varchar(30) DEFAULT NULL,"+\
                    "`message_version` int(2) DEFAULT NULL,"+\
                    "`in_processing` tinyint(1) DEFAULT '0',"+\
                    "PRIMARY KEY (id),"+\
                    "UNIQUE KEY server_message (messageid(36),server_id),"+\
                    "KEY server_id (server_id),"+\
                    "KEY serverid_isszr (server_id,isszr),"+\
                    "KEY messageid (messageid),"+\
                    "KEY status (status,type),"+\
                    "KEY message_name (message_name),"+\
                    "KEY dt (dtlasthandleattempt)) "+\
                    "ENGINE=MyISAM AUTO_INCREMENT=42920410 "+\
                    "DEFAULT CHARSET=latin1")
            db.session.connection().execute('commit')
            db.session.connection().close()
            ret = True
        except sql_exc.InternalError as e:
            print sys.exc_info()
            if e.orig[0] == 1050:
                ret = True
            else:
                print sys.exc_info()
                ret = False
    except:
        print sys.exc_info()
        ret = False
    return ret


def create_servers_table(config):
    try:
        db_manager = util.DBManager(config)
        db = db_manager.get_db()
        db.session.connection().execute('commit')
        try:
            db.session.connection().execute("CREATE TABLE `servers` ("+\
                    "`id` int(11) NOT NULL AUTO_INCREMENT,"+\
                    "`server_id` varchar(36) DEFAULT NULL,"+\
                    "`farm_id` int(11) DEFAULT NULL,"+\
                    "`farm_roleid` int(11) DEFAULT NULL,"+\
                    "`client_id` int(11) DEFAULT NULL,"+\
                    "`env_id` int(11) NOT NULL,"+\
                    "`role_id` int(11) DEFAULT NULL,"+\
                    "`platform` varchar(10) DEFAULT NULL,"+\
                    "`status` varchar(25) DEFAULT NULL,"+\
                    "`remote_ip` varchar(15) DEFAULT NULL,"+\
                    "`local_ip` varchar(15) DEFAULT NULL,"+\
                    "`dtadded` datetime DEFAULT NULL,"+\
                    "`index` int(11) DEFAULT NULL,"+\
                    "`dtshutdownscheduled` datetime DEFAULT NULL,"+\
                    "`dtrebootstart` datetime DEFAULT NULL,"+\
                    "`replace_server_id` varchar(36) DEFAULT NULL,"+\
                    "`dtlastsync` datetime DEFAULT NULL,"+\
                    "PRIMARY KEY (id),"+\
                    "KEY serverid (server_id),"+\
                    "KEY farm_roleid (farm_roleid),"+\
                    "KEY farmid_status (farm_id,status),"+\
                    "KEY local_ip (local_ip),"+\
                    "KEY env_id (env_id),"+\
                    "KEY role_id (role_id),"+\
                    "KEY client_id (client_id) )"+\
                    "ENGINE=InnoDB AUTO_INCREMENT=817009 "+\
                    "DEFAULT CHARSET=latin1")
            db.session.connection().execute('commit')
            db.session.connection().close()
            ret = True
        except sql_exc.InternalError as e:
            print sys.exc_info()
            if e.orig[0] == 1050:
                ret = True
            else:
                print sys.exc_info()
                ret = False
    except:
        print sys.exc_info()
        ret = False
    return ret


def create_server_properties_table(config):
    try:
        db_manager = util.DBManager(config)
        db = db_manager.get_db()
        db.session.connection().execute('commit')
        try:
            db.session.connection().execute("CREATE TABLE `server_properties` ("+\
                    "`id` int(11) NOT NULL AUTO_INCREMENT,"+\
                    "`server_id` varchar(36) DEFAULT NULL,"+\
                    "`name` varchar(255) DEFAULT NULL,"+\
                    "`value` text,"+\
                    "PRIMARY KEY (`id`),"+\
                    "UNIQUE KEY `serverid_name` (`server_id`,`name`),"+\
                    "KEY `serverid` (`server_id`),"+\
                    "KEY `name_value` (`name`(20),`value`(20)),"+\
                    "CONSTRAINT `server_properties_ibfk_1` FOREIGN KEY "+\
                    "(`server_id`) REFERENCES `servers` (`server_id`)"+\
                    "ON DELETE CASCADE ON UPDATE NO ACTION) "+\
                    "ENGINE=InnoDB AUTO_INCREMENT=533922744 "+\
                    "DEFAULT CHARSET=latin1")
            db.session.connection().execute('commit')
            db.session.connection().close()
            ret = True
        except sql_exc.InternalError as e:
            print sys.exc_info()
            if e.orig[0] == 1050:
                ret = True
            else:
                print sys.exc_info()
                ret = False
    except:
        print sys.exc_info()
        ret = False
    return ret
