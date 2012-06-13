<?php
class Scalr_UI_Controller_Dbmsr extends Scalr_UI_Controller
{
	public static function getPermissionDefinitions()
	{
		return array();
	}

	public function xSetupPmaAccessAction()
	{
		$this->request->defineParams(array(
			'farmId' => array('type' => 'int'),
			'farmRoleId' => array('type' => 'int')
		));

		$dbFarm = DBFarm::LoadByID($this->getParam('farmId'));
		$this->user->getPermissions()->validate($dbFarm);

		$dbFarmRole = DBFarmRole::LoadByID($this->getParam('farmRoleId'));
		if ($dbFarmRole->FarmID != $dbFarm->ID)
			throw new Exception("Role not found");

		$dbFarmRole->ClearSettings("mysql.pma");

		$masterDbServer = null;
		foreach ($dbFarmRole->GetServersByFilter(array('status' => SERVER_STATUS::RUNNING)) as $dbServer) {
			
			if ($dbFarmRole->GetRoleObject()->getDbMsrBehavior())
				$isMaster = $dbServer->GetProperty(Scalr_Db_Msr::REPLICATION_MASTER);
			else
				$isMaster = $dbServer->GetProperty(SERVER_PROPERTIES::DB_MYSQL_MASTER); 
			
			if ($isMaster) {
				$masterDbServer = $dbServer;
				break;
			}
		}

		if ($masterDbServer) {
			$time = $dbFarmRole->GetSetting(DBFarmRole::SETTING_MYSQL_PMA_REQUEST_TIME);
			if (!$time || $time+3600 < time()) {
				$msg = new Scalr_Messaging_Msg_Mysql_CreatePmaUser($dbFarmRole->ID, CONFIG::$PMA_INSTANCE_IP_ADDRESS);
				$masterDbServer->SendMessage($msg);

				$dbFarmRole->SetSetting(DBFarmRole::SETTING_MYSQL_PMA_REQUEST_TIME, time());
				$dbFarmRole->SetSetting(DBFarmRole::SETTING_MYSQL_PMA_REQUEST_ERROR, "");

				$this->response->success();
			}
			else
				throw new Exception("MySQL access credentials for PMA already requested. Please wait...");
		}
		else
			throw new Exception("There is no running MySQL master. Please wait until master starting up.");
	}

	public function xCreateDataBundleAction()
	{
		$this->request->defineParams(array(
			'farmId' => array('type' => 'int'),
			'farmRoleId' => array('type' => 'int')
		));

		$dbFarm = DBFarm::LoadByID($this->getParam('farmId'));
		$this->user->getPermissions()->validate($dbFarm);

		$dbFarmRole = DBFarmRole::LoadByID($this->getParam('farmRoleId'));
		if ($dbFarmRole->FarmID != $dbFarm->ID)
			throw new Exception("Role not found");

		if ($dbFarmRole->GetRoleObject()->hasBehavior(ROLE_BEHAVIORS::MYSQL)) {
			foreach ($dbFarmRole->GetServersByFilter(array('status' => SERVER_STATUS::RUNNING)) as $dbServer) {
				if ($dbServer->GetProperty(SERVER_PROPERTIES::DB_MYSQL_MASTER)) {

					if ($dbFarmRole->GetSetting(DBFarmRole::SETTING_MYSQL_IS_BUNDLE_RUNNING) == 1)
						throw new Exception("Data bundle already in progress");

					$dbServer->SendMessage(new Scalr_Messaging_Msg_Mysql_CreateDataBundle());

					$dbFarmRole->SetSetting(DBFarmRole::SETTING_MYSQL_IS_BUNDLE_RUNNING, 1);
					$dbFarmRole->SetSetting(DBFarmRole::SETTING_MYSQL_BUNDLE_SERVER_ID, $dbServer->serverId);

					$this->response->success('Data bundle successfully initiated');
					return;
				}
			}
		} else {
			foreach ($dbFarmRole->GetServersByFilter(array('status' => SERVER_STATUS::RUNNING)) as $dbServer) {
				if ($dbServer->GetProperty(Scalr_Db_Msr::REPLICATION_MASTER) == 1) {

					if ($dbFarmRole->GetSetting(Scalr_Db_Msr::DATA_BUNDLE_IS_RUNNING) == 1)
						throw new Exception("Data bundle already in progress");

					$dbServer->SendMessage(new Scalr_Messaging_Msg_DbMsr_CreateDataBundle());

					$dbFarmRole->SetSetting(Scalr_Db_Msr::DATA_BUNDLE_IS_RUNNING, 1);
					$dbFarmRole->SetSetting(Scalr_Db_Msr::DATA_BUNDLE_SERVER_ID, $dbServer->serverId);


					$this->response->success('Data bundle successfully initiated');
					return;
				}
			}
		}

		$this->response->failure('Scalr unable to initiate data bundle. No running replication master found.');
	}

	public function xCreateBackupAction()
	{
		$this->request->defineParams(array(
			'farmId' => array('type' => 'int'),
			'farmRoleId' => array('type' => 'int')
		));

		$dbFarm = DBFarm::LoadByID($this->getParam('farmId'));
		$this->user->getPermissions()->validate($dbFarm);

		$dbFarmRole = DBFarmRole::LoadByID($this->getParam('farmRoleId'));
		if ($dbFarmRole->FarmID != $dbFarm->ID)
			throw new Exception("Role not found");

		if ($dbFarmRole->GetRoleObject()->hasBehavior(ROLE_BEHAVIORS::MYSQL)) {
			if ($dbFarmRole->GetSetting(DBFarmRole::SETTING_MYSQL_IS_BCP_RUNNING) == 1)
				throw new Exception("Backuping already in progress");

			foreach ($dbFarmRole->GetServersByFilter(array('status' => SERVER_STATUS::RUNNING)) as $dbServer) {
				if (!$dbServer->GetProperty(SERVER_PROPERTIES::DB_MYSQL_MASTER))
					$slaveDbServer = $dbServer;
				else
					$masterDbServer = $dbServer;
			}

			if (!$slaveDbServer)
				$slaveDbServer = $masterDbServer;

			if ($slaveDbServer) {
				$slaveDbServer->SendMessage(new Scalr_Messaging_Msg_Mysql_CreateBackup($dbFarmRole->GetSetting(DBFarmRole::SETTING_MYSQL_ROOT_PASSWORD)));

				$dbFarmRole->SetSetting(DBFarmRole::SETTING_MYSQL_IS_BCP_RUNNING, 1);
				$dbFarmRole->SetSetting(DBFarmRole::SETTING_MYSQL_BCP_SERVER_ID, $slaveDbServer->serverId);

				$this->response->success('Backuping successfully initiated');
				return;
			}
		} else {
			if ($dbFarmRole->GetSetting(Scalr_Db_Msr::DATA_BACKUP_IS_RUNNING) == 1)
					throw new Exception("Backup already in progress");

			foreach ($dbFarmRole->GetServersByFilter(array('status' => SERVER_STATUS::RUNNING)) as $dbServer) {
				if (!$dbServer->GetProperty(Scalr_Db_Msr::REPLICATION_MASTER)) {
					$slaveDbServer = $dbServer;
					break;
				}
				else
					$masterDbServer = $dbServer;
			}

			if (!$slaveDbServer)
				$slaveDbServer = $masterDbServer;

			if ($slaveDbServer) {
				$slaveDbServer->SendMessage(new Scalr_Messaging_Msg_DbMsr_CreateBackup());

				$dbFarmRole->SetSetting(Scalr_Db_Msr::DATA_BACKUP_IS_RUNNING, 1);
				$dbFarmRole->SetSetting(Scalr_Db_Msr::DATA_BACKUP_SERVER_ID, $slaveDbServer->serverId);

				$this->response->success('Backuping successfully initiated');
				return;
			}
		}

		$this->response->failure('Scalr unable to initiate data backup. No running replication master found.');
	}

	public function statusAction()
	{
		$this->request->defineParams(array(
			'farmId' => array('type' => 'int'),
			'farmRoleId' => array('type' => 'int'),
			'type'
		));

		$dbFarm = DBFarm::LoadByID($this->getParam('farmId'));
		$this->user->getPermissions()->validate($dbFarm);

		if ($this->getParam('farmRoleId')) {
			$dbFarmRole = DBFarmRole::LoadByID($this->getParam('farmRoleId'));
			if ($dbFarmRole->FarmID != $dbFarm->ID)
				throw new Exception("Role not found");
		}
		elseif ($this->getParam('type')) {
			foreach ($dbFarm->GetFarmRoles() as $sDbFarmRole) {
				if ($sDbFarmRole->GetRoleObject()->hasBehavior($this->getParam('type'))) {
					$dbFarmRole = $sDbFarmRole;
					break;
				}
			}

			if (!$dbFarmRole)
				throw new Exception("Role not found");

		} else {
			throw new Scalr_UI_Exception_NotFound();
		}

		$data = array('farmRoleId' => $dbFarmRole->ID, 'farmHash' => $dbFarm->Hash, 'pmaAccessConfigured' => false);
		
		if ($dbFarmRole->GetSetting(DBFarmRole::SETTING_MYSQL_PMA_USER))
			$data['pmaAccessConfigured'] = true;
		else
		{
		
			$errmsg = $dbFarmRole->GetSetting(DBFarmRole::SETTING_MYSQL_PMA_REQUEST_ERROR);
			if (!$errmsg)
			{
				$time = $dbFarmRole->GetSetting(DBFarmRole::SETTING_MYSQL_PMA_REQUEST_TIME);
				if ($time)
				{
					if ($time+3600 < time())
						$data['pmaAccessError'] = _("Scalr didn't receive auth info from MySQL instance. Please check that MySQL running and Scalr has access to it.");
					else
						$data['pmaAccessSetupInProgress'] = true;
				}
			} else
				$data['pmaAccessError'] = $errmsg;
		}
		
		//TODO: Legacy code. Move to DB_MSR
		if ($dbFarmRole->GetRoleObject()->hasBehavior(ROLE_BEHAVIORS::MYSQL)) {
			$data['dbType'] = Scalr_Db_Msr::DB_TYPE_MYSQL;

			$data['dtLastBundle'] = $dbFarmRole->GetSetting(DBFarmRole::SETTING_MYSQL_LAST_BUNDLE_TS) ? Scalr_Util_DateTime::convertTz((int)$dbFarmRole->GetSetting(DBFarmRole::SETTING_MYSQL_LAST_BUNDLE_TS), 'd M Y \a\\t H:i:s') : 'Never';
			$data['dtLastBackup'] = $dbFarmRole->GetSetting(DBFarmRole::SETTING_MYSQL_LAST_BCP_TS) ? Scalr_Util_DateTime::convertTz((int)$dbFarmRole->GetSetting(DBFarmRole::SETTING_MYSQL_LAST_BCP_TS), 'd M Y \a\\t H:i:s') : 'Never';
			
			$data['additionalInfo']['MasterUsername'] = 'scalr';
			$data['additionalInfo']['MasterPassword'] = $dbFarmRole->GetSetting(DBFarmRole::SETTING_MYSQL_ROOT_PASSWORD);
			
			$slaveNumber = 0;
			
			foreach ($dbFarmRole->GetServersByFilter() as $dbServer) {
				if ($dbServer->status != SERVER_STATUS::RUNNING) {
					//TODO:
					continue;
				}

				if ($dbServer->GetProperty(SERVER_PROPERTIES::DB_MYSQL_MASTER) == 1)
				{
					$data['isBundleRunning'] = $dbFarmRole->GetSetting(DBFarmRole::SETTING_MYSQL_IS_BUNDLE_RUNNING);
					$data['bundleServerId'] = $dbFarmRole->GetSetting(DBFarmRole::SETTING_MYSQL_BUNDLE_SERVER_ID);
					
					if ($data['isBundleRunning']) {
						$opId = $this->db->GetOne("SELECT id FROM server_operations WHERE server_id = ? AND name = ? AND status = ? ORDER BY timestamp DESC", array(
							$data['bundleServerId'], 'MySQL data bundle', 'running'
						));
					} elseif ($data['bundleServerId']) {
						$opId = $this->db->GetOne("SELECT id FROM server_operations WHERE server_id = ? AND name = ? ORDER BY timestamp DESC", array(
							$data['bundleServerId'], 'MySQL data bundle'
						));
					}
					
					if ($opId)
						$data['bundleOperationId'] = $opId;
				}

	   			$data['isBackupRunning'] = $dbFarmRole->GetSetting(DBFarmRole::SETTING_MYSQL_IS_BCP_RUNNING);
				$data['backupServerId'] = $dbFarmRole->GetSetting(DBFarmRole::SETTING_MYSQL_BCP_SERVER_ID);
				
				if (!$data['backupOperationId']) {
					if ($data['isBackupRunning']) {
						$opId = $this->db->GetOne("SELECT id FROM server_operations WHERE server_id = ? AND name = ? AND status = ? ORDER BY timestamp DESC", array(
							$data['backupServerId'], 'MySQL backup', 'running'
						));
					} elseif ($data['backupServerId']) {
						$opId = $this->db->GetOne("SELECT id FROM server_operations WHERE server_id = ? AND name = ? ORDER BY timestamp DESC", array(
							$data['backupServerId'], 'MySQL backup'
						));
					}
					
					if ($opId)
						$data['backupOperationId'] = $opId;
				}

				try
		   		{
		   			$conn = &NewADOConnection("mysqli");
		   			$conn->Connect($dbServer->remoteIp, 'scalr_stat', $dbFarmRole->GetSetting(DBFarmRole::SETTING_MYSQL_STAT_PASSWORD), null);
		   			$conn->SetFetchMode(ADODB_FETCH_ASSOC);

					if ($dbServer->GetProperty(SERVER_PROPERTIES::DB_MYSQL_MASTER) == 1)
					{
		   				$r = $conn->GetRow("SHOW MASTER STATUS");
		   				$MasterPosition = $r['Position'];
		   				$master_ip = $dbServer->remoteIp;
		   				$master_iid = $dbServer->serverId;
					}
		   			else
		   			{
		   				$r = $conn->GetRow("SHOW SLAVE STATUS");

		   				$num = ++$slaveNumber;
		   				$SlavePosition = $r['Exec_Master_Log_Pos'];
		   			}

		   			$data["replicationStatus"][] =
		   			array(
		   				"serverId" => $dbServer->serverId,
		   				"localIp" => $dbServer->localIp,
		   				"remoteIp" => $dbServer->remoteIp,
		   				"data" => $r,
		   				"masterPosition" => $MasterPosition,
		   				"slavePosition" => $SlavePosition,
		   				"replicationRole" => $dbServer->GetProperty(SERVER_PROPERTIES::DB_MYSQL_MASTER) ? 'Master' : "Slave #{$num}"
		   			);
		   		}
		   		catch(Exception $e)
		   		{
		   			$data["replicationStatus"][] = array(
		   				"serverId" => $dbServer->serverId,
		   				"localIp" => $dbServer->localIp,
		   				"remoteIp" => $dbServer->remoteIp,
		   				"error" => ($e->msg) ? $e->msg : $e->getMessage(),
		   				"replicationRole" => $dbServer->GetProperty(SERVER_PROPERTIES::DB_MYSQL_MASTER) ? 'Master' : 'Slave'
		   			);
		   		}
			}

		} else {

			$data['dbType'] = $dbFarmRole->GetRoleObject()->getDbMsrBehavior();
			if (!$data['dbType'])
				$this->response->failure("Unknown db type");
			
			$data['additionalInfo']['MasterUsername'] = 'scalr';
			
			if ($dbFarmRole->GetRoleObject()->hasBehavior(ROLE_BEHAVIORS::POSTGRESQL)) {
				$data['additionalInfo']['MasterPassword'] = $dbFarmRole->GetSetting(Scalr_Db_Msr_Postgresql::ROOT_PASSWORD);
				$name = 'PostgreSQL';
			} elseif ($dbFarmRole->GetRoleObject()->hasBehavior(ROLE_BEHAVIORS::REDIS)) {
				$data['additionalInfo']['MasterPassword'] = $dbFarmRole->GetSetting(Scalr_Db_Msr_Redis::MASTER_PASSWORD);
				$name = 'Redis';
			} elseif ($dbFarmRole->GetRoleObject()->hasBehavior(ROLE_BEHAVIORS::MYSQL2)) {
				$data['additionalInfo']['MasterPassword'] = $dbFarmRole->GetSetting(Scalr_Db_Msr_Mysql2::ROOT_PASSWORD);
				$name = 'MySQL';
			}

			$data['dtLastBackup'] = $dbFarmRole->GetSetting(Scalr_Db_Msr::DATA_BACKUP_LAST_TS) ? Scalr_Util_DateTime::convertTz((int)$dbFarmRole->GetSetting(Scalr_Db_Msr::DATA_BACKUP_LAST_TS), 'd M Y \a\\t H:i:s') : 'Never';
			$data['dtLastBundle'] = $dbFarmRole->GetSetting(Scalr_Db_Msr::DATA_BUNDLE_LAST_TS) ? Scalr_Util_DateTime::convertTz((int)$dbFarmRole->GetSetting(Scalr_Db_Msr::DATA_BUNDLE_LAST_TS), 'd M Y \a\\t H:i:s') : 'Never';

			$slaveNumber = 0;
			
			foreach ($dbFarmRole->GetServersByFilter() as $dbServer) {
				if ($dbServer->status != SERVER_STATUS::RUNNING) {
					//TODO:
					continue;
				}

				if ($dbServer->GetProperty(Scalr_Db_Msr::REPLICATION_MASTER) == 1) {
					$data['isBundleRunning'] = $dbFarmRole->GetSetting(Scalr_Db_Msr::DATA_BUNDLE_IS_RUNNING);
					$data['bundleServerId'] = $dbFarmRole->GetSetting(Scalr_Db_Msr::DATA_BUNDLE_SERVER_ID);
					
					if ($data['isBundleRunning']) {
						$opId = $this->db->GetOne("SELECT id FROM server_operations WHERE server_id = ? AND name = ? AND status = ? ORDER BY timestamp DESC", array(
							$data['bundleServerId'], "{$name} data bundle", 'running'
						));
					} elseif ($data['bundleServerId']) {
						$opId = $this->db->GetOne("SELECT id FROM server_operations WHERE server_id = ? AND name = ? ORDER BY timestamp DESC", array(
							$data['bundleServerId'], "{$name} data bundle"
						));
					}
					
					if ($opId)
						$data['bundleOperationId'] = $opId;
				}

	   			$data['isBackupRunning'] = $dbFarmRole->GetSetting(Scalr_Db_Msr::DATA_BACKUP_IS_RUNNING);
				$data['backupServerId'] = $dbFarmRole->GetSetting(Scalr_Db_Msr::DATA_BACKUP_SERVER_ID);
				
				if (!$data['backupOperationId']) {
					if ($data['isBackupRunning']) {
						$opId = $this->db->GetOne("SELECT id FROM server_operations WHERE server_id = ? AND name = ? AND status = ? ORDER BY timestamp DESC", array(
							$data['backupServerId'], "{$name} backup", 'running'
						));
					} elseif ($data['backupServerId']) {
						$opId = $this->db->GetOne("SELECT id FROM server_operations WHERE server_id = ? AND name = ? ORDER BY timestamp DESC", array(
							$data['backupServerId'], "{$name} backup"
						));
					}
					
					if ($opId)
						$data['backupOperationId'] = $opId;
				}

				try {
					if ($dbServer->GetProperty(Scalr_Db_Msr::REPLICATION_MASTER) == 1) {
						//TODO:
					}
		   			else
		   			{
		   				$num = ++$slaveNumber;
		   			}

		   			$data["replicationStatus"][] =
		   			array(
		   				"serverId" => $dbServer->serverId,
		   				"localIp" => $dbServer->localIp,
		   				"remoteIp" => $dbServer->remoteIp,
		   				"data" => array(),
		   				"replicationRole" => $dbServer->GetProperty(Scalr_Db_Msr::REPLICATION_MASTER) ? 'Master' : "Slave #{$num}"
		   			);
		   		}
		   		catch(Exception $e)
		   		{
		   			$data["replicationStatus"][] = array(
		   				"serverId" => $dbServer->serverId,
		   				"error" => ($e->msg) ? $e->msg : $e->getMessage(),
		   				"replicationRole" => $dbServer->GetProperty(Scalr_Db_Msr::REPLICATION_MASTER) ? 'Master' : 'Slave'
		   			);
		   		}
			}
		}

		$this->response->page('ui/dbmsr/status.js', $data);
	}
}
