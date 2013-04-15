<?php

	class DBRole
	{
		public
			$id,
			$name,
			$imageId,
			$envId,
			$origin,
			$clientId,
			$description,
			$isStable,
			$isDevel,
			$approvalState,
			$generation,
			$os,
			$architecture,
			$szrVersion;

		private
			$db,
			$behaviors,
			$tags = array(),
			$images,
			$behaviorsRaw,
			$history,
			$environment;


		/*Temp*/
		public $instanceType;

		private static $FieldPropertyMap = array(
			'id' 			=> 'id',
			'client_id'		=> 'clientId',
			'origin'		=> 'origin',
			'name'			=> 'name',
			'architecture'	=> 'architecture',
			'env_id'		=> 'envId',
			'description'	=> 'description',
			'is_stable'		=> 'isStable',
			'is_devel'		=> 'isDevel',
			'generation'	=> 'generation',
			'os'			=> 'os',
			'approval_state'=> 'approvalState',
			'history'		=> 'history',
			'behaviors'		=> 'behaviorsRaw',
			'szr_version'	=> 'szrVersion'
		);

		const PROPERTY_SSH_PORT = 'system.ssh-port';
		const PROPERTY_NIMBULA_ENTRY = 'nimbula.entry';
		const PROPERTY_NIMBULA_INIT_ROOT_USER = 'nimbula.init.root_user';
		const PROPERTY_NIMBULA_INIT_ROOT_PASS = 'nimbula.init.root_pass';


		public function __construct($id)
		{
			$this->id = $id;
			$this->db = Core::GetDBInstance();
		}

		public function setBehaviors($behaviors)
		{
			//TODO: validation

			$this->behaviorsRaw = implode(",", $behaviors);
			$this->behaviors = null;
		}

		public function setProperty($name, $value)
		{
			$this->db->Execute("REPLACE INTO role_properties SET
				`role_id` = ?,
				`name`	= ?,
				`value`	= ?
			", array(
				$this->id,
				$name,
				$value
			));
		}

		public function getProperty($name)
		{
			return $this->db->GetOne("SELECT value FROM role_properties WHERE `role_id` = ? AND `name` = ?", array(
				$this->id, $name
			));
		}

		public function getSecurityRules()
		{
			return $this->db->GetAll("SELECT * FROM role_security_rules WHERE role_id=?", array($this->id));
		}

		public function getRoleHistory($get_last = true)
		{
			$history = explode(",", $this->history);

			if ($get_last)
				return array_pop($history);
			else
				return $history;
		}

		public function getTags()
		{
			$this->loadTagsCache();

			return array_keys($this->tags);
		}

		public function hasTag($tag)
		{
			$this->loadTagsCache();

			return ($this->tags[$tag] == 1);
		}

		public function getDbMsrBehavior()
		{
			if ($this->hasBehavior(ROLE_BEHAVIORS::REDIS))
				return ROLE_BEHAVIORS::REDIS;
			elseif ($this->hasBehavior(ROLE_BEHAVIORS::POSTGRESQL))
				return ROLE_BEHAVIORS::POSTGRESQL;
			elseif ($this->hasBehavior(ROLE_BEHAVIORS::MYSQL2))
				return ROLE_BEHAVIORS::MYSQL2;
			elseif ($this->hasBehavior(ROLE_BEHAVIORS::PERCONA))
				return ROLE_BEHAVIORS::PERCONA;
				
			return false;
		}
		
		public function hasBehavior($behavior)
		{
			return (in_array($behavior, $this->getBehaviors()));
		}

		public function getSoftwareList()
		{
			$retval = array();
			foreach ((array)$this->db->GetAll("SELECT * FROM role_software WHERE role_id=?", array($this->id)) as $soft)
				$retval[$soft['software_key']] = array('name' => $soft['software_name'], 'version' => $soft['software_version']);

			return $retval;
		}

		public function getBehaviors()
		{
			if (!$this->behaviors)
				$this->behaviors = explode(",", $this->behaviorsRaw);

			return $this->behaviors;
		}

		private function loadTagsCache()
		{
			if (!$this->tags)
			{
				$tags = $this->db->Execute("SELECT * FROM role_tags WHERE role_id=?", array($this->id));
				while ($t = $tags->FetchRow())
					$this->tags[$t['tag']] = 1;
			}
		}

		private function loadImagesCache()
		{
			if (!$this->images)
			{
				$images = $this->db->GetAll("SELECT * FROM role_images WHERE role_id=?", array($this->id));
				foreach ($images as $image)
				{
					$this->images[$image['platform']][$image['cloud_location']] = $image['image_id'];
					$this->imagesDetails[$image['platform']][$image['cloud_location']] = array(
						'image_id' 	=> $image['image_id'],
						'os_name'	=> $image['os_name'],
						'os_family' => $image['os_family'],
						'os_version'=> $image['os_version'],
						'architecture'=> $image['architecture']
					);
				}
			}
		}

		public function getCloudLocations($platform = null)
		{
			$this->loadImagesCache();
			
			$retval = array();

			if (!$platform)
			{
				foreach ($this->getPlatforms() as $platform)
					$retval = array_merge($this->images[$platform], $retval);
			}
			else
				$retval = $this->images[$platform];

			return array_keys($retval);
		}

		public function getPlatforms()
		{
			$this->loadImagesCache();

			return array_keys($this->images);
		}

		public function getImages($extended = false)
		{
			$this->loadImagesCache();

			if (!$extended)
				return $this->images;
			else
				return $this->imagesDetails;
		}

		public function getImagesString()
		{
			$this->loadImagesCache();

			$images = "";

			foreach ($this->images as $p => $r)
			{
				foreach ($r as $rk => $i)
				{
					$images .= "{$p}/{$rk}: {$i}, ";
				}
			}

			$images = trim($images, ", ");

			return $images;
		}

		public function getImageDetails($platform, $cloudLocation) {
			$this->loadImagesCache();
			return $this->imagesDetails[$platform][$cloudLocation];
		}
		
		public function getImageId($platform = null, $cloudLocation = null)
		{
			$this->loadImagesCache();

			if ($platform)
			{
				if ($cloudLocation)
				{
					$allRegionsImage = $this->images[$platform][''];
					
					$retval = $this->images[$platform][$cloudLocation];
					if (!$retval)
						return $allRegionsImage;
					else
						return $retval;
				}
				else
					return $this->images[$platform];
			}
			else
				return array_shift(array_values(array_values($this->images)));
		}

		/**
		 * @return Scalr_Environment
		 * Enter description here ...
		 */
		public function getEnvironmentObject()
		{
			if (!$this->environment)
				$this->environment = Scalr_Model::init(Scalr_Model::ENVIRONMENT)->loadById($this->envId);

			return $this->environment;
		}

		public static function loadByFilter(array $filter)
		{
			$db = Core::GetDBInstance();

			$sql = "SELECT id FROM roles WHERE 1=1";
			$args = array();
			foreach ($filter as $k=>$v)
			{
				$sql .= " AND `{$k}`=?";
				$args[] = $v;
			}

			$roles = $db->GetAll($sql, $args);
			if (count($roles) == 1)
			{
				return self::loadById($roles[0]['id']);
			}
			else
			{
				$retval = array();
				foreach ($roles as $role)
					$retval[] = self::loadById($role['id']);

				return $retval;
			}
		}

		/**
		 * @return DBRole
		 * @param unknown_type $id
		 */
		public static function loadById($id)
		{
			$db = Core::GetDBInstance();

			$roleinfo = $db->GetRow("SELECT * FROM roles WHERE id=?", array($id));
			if (!$roleinfo)
				throw new Exception(sprintf(_("Role ID#%s not found in database"), $id));

			$DBRole = new DBRole($id);

			foreach(self::$FieldPropertyMap as $k=>$v)
			{
				if (isset($roleinfo[$k]))
					$DBRole->{$v} = $roleinfo[$k];
			}

			return $DBRole;
		}

		private function getVersionInfo($v) {
			if (preg_match("/^([0-9]+)\.([0-9]+)[-\.]?([0-9]+)?$/si", $v, $matches)) {
				$verInfo = array_map("intval", array_slice($matches, 1));
				while (count($verInfo) < 3) {
					$verInfo[] = 0;
				}
				return $verInfo;
			} else {
				return array(0, 0, 0);
			}
		}
		
		public function isSupported($v) {
			return $this->getVersionInfo($this->szrVersion) >= $this->getVersionInfo($v);
		}
		
		public function save()
		{
			if (!$this->id) {
				$this->db->Execute("INSERT INTO roles SET
					name		= ?,
					description	= ?,
					architecture= ?,
					generation	= ?,
					origin		= ?,
					env_id		= ?,
					is_stable	= '1',
					approval_state	= ?,
					client_id	= ?,
					szr_version	= ?,
					behaviors	= ?,
					os			= ?
				", array($this->name, $this->description, $this->architecture, $this->generation,
				$this->origin, $this->envId, APPROVAL_STATE::APPROVED, $this->clientId, $this->szrVersion, $this->behaviorsRaw, $this->os));

				$this->id = $this->db->Insert_ID();

				$this->db->Execute("DELETE FROM role_behaviors WHERE role_id = ?", array($this->id));
				foreach ($this->getBehaviors() as $behavior)
					$this->db->Execute("INSERT INTO role_behaviors SET role_id = ?, behavior = ?", array($this->id, $behavior));

			} else {
				$this->db->Execute("UPDATE roles SET
					name		= ?,
					description	= ?,
					behaviors	= ?
				WHERE id =?
				", array($this->name, $this->description, $this->behaviorsRaw, $this->id));

				$this->db->Execute("DELETE FROM role_behaviors WHERE role_id = ?", array($this->id));
				foreach ($this->getBehaviors() as $behavior)
					$this->db->Execute("INSERT INTO role_behaviors SET role_id = ?, behavior = ?", array($this->id, $behavior));

			}
			
			return $this;
		}

		public function remove($removeImage = false)
		{
			if ($removeImage)
			{				
				$platforms = array_keys($this->getImages());
				foreach ($platforms as $platform)
					PlatformFactory::NewPlatform($platform)->RemoveServerSnapshot($this);
			}

			$this->db->Execute("DELETE FROM roles WHERE id = ?", array($this->id));
			$this->db->Execute("DELETE FROM roles_queue WHERE role_id = ?", array($this->id));
		}

		public function isUsed()
		{
			return (bool)$this->db->GetOne("SELECT id FROM farm_roles WHERE role_id=? OR new_role_id=?",
				array($this->id, $this->id)
			);
		}

		public function removeImage($imageId)
		{
			$this->db->Execute("DELETE FROM role_images WHERE image_id = ? AND role_id = ?", array($imageId, $this->id));
		}

		public function setImage($imageId, $platform, $cloudLocation='', $agentVersion = '', $osFamily = '', $osName = '', $osVersion = '', $architecture = '')
		{
			if (!in_array($osFamily, array('ubuntu', 'fedora'))) {
				$nOsVersion = strstr($osVersion, '.', true);
                if (!$nOsVersion)
                    $nOsVersion = $osVersion;
                
                $osVersion = $nOsVersion;
			}
			
			$this->db->Execute("INSERT INTO role_images SET
				`role_id`			= ?,
				`cloud_location`	= ?,
				`image_id`			= ?,
				`platform`			= ?,
				`agent_version`		= ?,
				`os_family`			= ?,
				`os_name`			= ?,
				`os_version`		= ?,
				`architecture`		= ?
				ON DUPLICATE KEY UPDATE 
				`image_id` = ?, 
				`os_family`			= ?,
				`os_name`			= ?,
				`os_version`		= ?,
				`architecture`		= ?
			", array(
				$this->id,
				$cloudLocation,
				trim($imageId),
				$platform,
				$agentVersion,
				$osFamily,
				$osName,
				$osVersion,
				$architecture,
				trim($imageId),
				$osFamily,
				$osName,
				$osVersion,
				$architecture
			));
		}

		public function setTags(array $tags = array())
		{
			$this->db->Execute("DELETE FROM role_tags WHERE role_id = ?", array($this->id));
			foreach ($tags as $tag) {
				$this->db->Execute("INSERT INTO role_tags SET role_id = ?, `tag` = ?", array($this->id, $tag));
			}
		}

		public function setSoftware(array $software = array())
		{
			//TODO: validate

			foreach ($software as $software_key => $software_version) {
				$this->db->Execute("REPLACE INTO role_software SET
					role_id			= ?,
					software_name	= ?,
					software_version= ?,
					software_key	= ?
				", array(
					$this->id,
					$software_key,
					$software_version,
					$software_key
				));
			}
		}

		public function getParameters()
		{
			$dbParams = $this->db->Execute("SELECT * FROM role_parameters WHERE role_id = ?", array($this->id));
			$retval = array();
			while ($param = $dbParams->FetchRow()) {
				$retval[] = array(
					'name'	=> $param['name'],
					'hash'	=> $param['hash'],
					'type'	=> $param['type'],
					'required'	=> $param['isrequired'],
					'defval'	=> $param['defval']
				);
			}

			return $retval;
		}

		public function setParameters(array $params = array())
		{
			$this->db->Execute("DELETE FROM role_parameters WHERE role_id = ?", array($this->id));
			foreach ($params as $param) {
				$param = (array)$param;

				$this->db->Execute("INSERT INTO role_parameters SET
					`role_id`		= ?,
					`name`			= ?,
					`type`			= ?,
					`isrequired`	= ?,
					`defval`		= ?,
					`allow_multiple_choice`	= 0,
					`options`		= '',
					`hash`			= ?,
					`issystem`		= 1
				", array(
					$this->id,
					$param['name'],
					$param['type'],
					$param['required'],
					$param['defval'],
					str_replace(" ", "_", strtolower($param['name']))
				));
			}
		}

		public function getScripts()
		{
			$dbParams = $this->db->Execute("SELECT role_scripts.*, scripts.name AS script_name FROM role_scripts JOIN scripts ON role_scripts.script_id = scripts.id WHERE role_id = ?", array($this->id));
			$retval = array();
			while ($script = $dbParams->FetchRow()) {
				$retval[] = array(
					'role_script_id' => $script['id'],
					'event_name' => $script['event_name'],
					'target' => $script['target'],
					'script_id' => $script['script_id'],
					'script_name' => $script['script_name'],
					'version' => (int) $script['version'],
					'timeout' => $script['timeout'],
					'issync' => $script['issync'],
					'params' => unserialize($script['params']),
					'order_index' => $script['order_index'],
					'hash' => $script['hash']
				);
			}

			return $retval;
		}

		public function setScripts(array $scripts)
		{
			if (! $this->id)
				return;

			if (! is_array($scripts))
				return;

			$ids = array();
			foreach ($scripts as $script) {
				// TODO: check permission for script_id
				if (!$script['role_script_id']) {
					$this->db->Execute('INSERT INTO role_scripts SET
						`role_id` = ?,
						`event_name` = ?,
						`target` = ?,
						`script_id` = ?,
						`version` = ?,
						`timeout` = ?,
						`issync` = ?,
						`params` = ?,
						`order_index` = ?,
						`hash` = ?
					', array(
						$this->id,
						$script['event_name'],
						$script['target'],
						$script['script_id'],
						$script['version'],
						$script['timeout'],
						$script['issync'],
						serialize($script['params']),
						$script['order_index'],
						(!$script['hash']) ? Scalr_Util_CryptoTool::sault(12) : $script['hash']
					));
					$ids[] = $this->db->Insert_ID();
				} else {
					$this->db->Execute('UPDATE role_scripts SET
						`event_name` = ?,
						`target` = ?,
						`script_id` = ?,
						`version` = ?,
						`timeout` = ?,
						`issync` = ?,
						`params` = ?,
						`order_index` = ?
						WHERE id = ? AND role_id = ?
					', array(
						$script['event_name'],
						$script['target'],
						$script['script_id'],
						$script['version'],
						$script['timeout'],
						$script['issync'],
						serialize($script['params']),
						$script['order_index'],
						
						$script['role_script_id'],
						$this->id
					));
					$ids[] = $script['role_script_id'];
				}
			}
			
			$toRemove = $this->db->Execute('SELECT id, hash FROM role_scripts WHERE role_id = ? AND id NOT IN (\'' . implode("','", $ids) . '\')', array($this->id));
			while ($rScript = $toRemove->FetchRow()) {
				$this->db->Execute("DELETE FROM farm_role_scripting_params WHERE hash = ? AND farm_role_id IN (SELECT id FROM farm_roles WHERE role_id = ?)", 
					array($rScript['hash'], $this->id)
				);
				$this->db->Execute("DELETE FROM role_scripts WHERE id = ?", array($rScript['id']));
			}
		}

        public function cloneRole($newRoleName, $accountId, $envId)
        {
            $this->db->BeginTrans();
            try {
                $this->db->Execute("INSERT INTO roles SET
                    name            = ?,
                    origin          = ?,
                    client_id       = ?,
                    env_id          = ?,
                    description     = ?,
                    behaviors       = ?,
                    architecture    = ?,
                    is_stable       = '1',
                    history         = ?,
                    approval_state  = ?,
                    generation      = ?,
                    os              = ?,
                    szr_version     = ?
                ", array(
                    $newRoleName,
                    ROLE_TYPE::CUSTOM,
                    $accountId,
                    $envId,
                    $this->description,
                    $this->behaviorsRaw,
                    $this->architecture,
                    "*cloned from {$this->name} ($this->id)*",
                    APPROVAL_STATE::APPROVED,
                    2,
                    $this->os,
                    $this->szrVersion
                ));
    
                $newRoleId = $this->db->Insert_Id();
                
                //Set behaviors
                foreach ($this->getBehaviors() as $behavior)
                    $this->db->Execute("INSERT INTO role_behaviors SET role_id = ?, behavior = ?", array($newRoleId, $behavior));
                
                // Set images
                $rsr7 = $this->db->Execute("SELECT * FROM role_images WHERE role_id = ?", array($this->id));
                while ($r7 = $rsr7->FetchRow()) {
                    $this->db->Execute("INSERT INTO role_images SET
                        `role_id` = ?,
                        `cloud_location` = ?,
                        `image_id` = ?,
                        `platform` = ?,
                        `architecture` = ?, 
                        `os_family`  = ?,
                        `os_name`  = ?,
                        `os_version`  = ?,
                        `agent_version` = ?
                    ", array($newRoleId, $r7['cloud_location'], $r7['image_id'], $r7['platform'], $r7['architecture'], $r7['os_family'], $r7['os_name'], $r7['os_version'], $r7['agent_version']));
                }
                
                //Set tags
                $rsr1 = $this->db->Execute("SELECT * FROM role_tags WHERE role_id = ?", array($this->id));
                $tags = array();
                while ($r1 = $rsr1->FetchRow()) {
                    $this->db->Execute("INSERT INTO role_tags SET
                        `role_id` = ?,
                        `tag` = ?
                    ", array($newRoleId, $r1['tag']));
                }
                
                //Set software
                $rsr2 = $this->db->Execute("SELECT * FROM role_software WHERE role_id = ?", array($this->id));
                while ($r2 = $rsr2->FetchRow()) {
                    $this->db->Execute("INSERT INTO role_software SET
                        `role_id` = ?,
                        `software_name` = ?,
                        `software_version` = ?,
                        `software_key` = ?
                    ", array($newRoleId, $r2['software_name'], $r2['software_version'], $r2['software_key']));
                }
                
                //Set security rules
                $rsr3 = $this->db->Execute("SELECT * FROM role_security_rules WHERE role_id = ?", array($this->id));
                while ($r3 = $rsr3->FetchRow()) {
                    $this->db->Execute("INSERT INTO role_security_rules SET
                        `role_id` = ?,
                        `rule` = ?
                    ", array($newRoleId, $r3['rule']));
                }
                
                //Set properties
                $rsr5 = $this->db->Execute("SELECT * FROM role_properties WHERE role_id = ?", array($this->id));
                while ($r5 = $rsr5->FetchRow()) {
                    $this->db->Execute("INSERT INTO role_properties SET
                        `role_id` = ?,
                        `name` = ?,
                        `value` = ?
                    ", array($newRoleId, $r5['name'], $r5['value']));
                }
                
                //Set parameters
                $rsr6 = $this->db->Execute("SELECT * FROM role_parameters WHERE role_id = ?", array($this->id));
                while ($r6 = $rsr6->FetchRow()) {
                    $this->db->Execute("INSERT INTO role_parameters SET
                        `role_id` = ?,
                        `name` = ?,
                        `type` = ?,
                        `isrequired` = ?,
                        `defval` = ?,
                        `allow_multiple_choice` = ?,
                        `options` = ?,
                        `hash` = ?,
                        `issystem` = ?
                    ", array($newRoleId, $r6['name'], $r6['type'], $r6['isrequired'], $r6['defval'], $r6['allow_multiple_choice'], $r6['options'], $r6['hash'], $r6['issystem']));
                }
                
                //Set scripts
                $rsr8 = $this->db->Execute("SELECT * FROM role_scripts WHERE role_id = ?", array($this->id));
                while ($r8 = $rsr8->FetchRow()) {
                    $this->db->Execute("INSERT INTO role_scripts SET
                        role_id = ?,
                        event_name = ?,
                        target = ?,
                        script_id = ?,
                        version = ?,
                        timeout = ?,
                        issync = ?,
                        params = ?,
                        order_index = ?,
                        hash = ?
                    ", array(
                        $newRoleId, $r8['event_name'], $r8['target'], $r8['script_id'], $r8['version'],
                        $r8['timeout'], $r8['issync'], $r8['params'], $r8['order_index'], Scalr_Util_CryptoTool::sault(12)
                    ));
                }
            } catch (Exception $e) {
                $this->db->RollbackTrans();
                throw $e;
            }
            
            $this->db->CommitTrans();
            
            return $newRoleId;
        }

		public static function createFromBundleTask(BundleTask $BundleTask)
		{
			$db = Core::GetDBInstance();

			if ($BundleTask->prototypeRoleId) {
				$proto_role = $db->GetRow("SELECT * FROM roles WHERE id=?", array($BundleTask->prototypeRoleId));

				$DBServer = DBServer::LoadByID($BundleTask->serverId);
			} else {
				$DBServer = DBServer::LoadByID($BundleTask->serverId);
				if ($DBServer->platform != SERVER_PLATFORMS::RDS) 
				{
					$proto_role = array(
						"behaviors" => $DBServer->GetProperty(SERVER_PROPERTIES::SZR_IMPORTING_BEHAVIOR),
						"architecture" => $DBServer->GetProperty(SERVER_PROPERTIES::ARCHITECTURE),
						"name" => "*import*"
					);
				}
			}

			if (!$BundleTask->cloudLocation) {
				if ($DBServer)
					$BundleTask->cloudLocation = $DBServer->GetCloudLocation();
			}

			$meta = $BundleTask->getSnapshotDetails();
			if ($meta) {
				if ($meta['os'])
					$os = $meta['os']->version;
			}
			else
				$os = $proto_role['os'];

			$db->Execute("INSERT INTO roles SET
				name			= ?,
				origin			= ?,
				client_id		= ?,
				env_id			= ?,
				description		= ?,
				behaviors		= ?,
				architecture	= ?,
				is_stable		= '1',
				history			= ?,
				approval_state	= ?,
				generation		= ?,
				os				= ?,
				szr_version		= ?
			", array(
				$BundleTask->roleName,
				ROLE_TYPE::CUSTOM,
				$BundleTask->clientId,
				$BundleTask->envId,
				$BundleTask->description,
				$proto_role['behaviors'],
				$proto_role['architecture'],
				trim("{$proto_role['history']},{$proto_role['name']}", ","),
				APPROVAL_STATE::APPROVED,
				($DBServer->IsSupported("0.5")) ? 2 : 1,
				($os) ? $os : "Unknown",
				$meta['szr_version']
			));

			$role_id = $db->Insert_Id();

			$BundleTask->roleId = $role_id;
			$BundleTask->Save();

			$BundleTask->Log(sprintf("Created new role. Role name: %s. Role ID: %s",
				$BundleTask->roleName, $BundleTask->roleId
			));

			$role =  self::loadById($role_id);

			$behaviors = explode(",", $proto_role['behaviors']);
			foreach ($behaviors as $behavior) {
				$db->Execute("INSERT INTO role_behaviors SET
					role_id			= ?,
					behavior		= ?
				", array(
					$role_id,
					$behavior
				));
			}

			// Set image
			$role->setImage(
				$BundleTask->snapshotId, 
				$BundleTask->platform, 
				($BundleTask->platform != SERVER_PLATFORMS::GCE) ? $BundleTask->cloudLocation : "", 
				$meta['szr_version'], 
				$BundleTask->osFamily,
				$BundleTask->osName,
				$BundleTask->osVersion,
				$proto_role['architecture']
			);

			// Set params
			if ($proto_role['id'])
			{
				$dbParams = $db->GetAll("SELECT name,type,isrequired,defval,allow_multiple_choice,options,hash,issystem
					FROM role_parameters WHERE role_id = ?", array($proto_role['id'])
				);
				$role->setParameters($dbParams);

				$dbSecRules = $db->GetAll("SELECT * FROM role_security_rules WHERE role_id = ?", array($proto_role['id']));
				foreach ($dbSecRules as $dbSecRule) {
					$db->Execute("INSERT INTO role_security_rules SET role_id = ?, rule = ?", array(
						$role_id, $dbSecRule['rule']
					));
				}

				$props = $db->GetAll("SELECT * FROM role_properties WHERE role_id=?", array($proto_role['id']));
				foreach ($props as $prop) {
					$role->setProperty($prop['name'], $prop['value']);
				}
				
				$scripts = $db->GetAll("SELECT * FROM role_scripts WHERE role_id=?", array($proto_role['id']));
				foreach ($scripts as &$script)
					$script['params'] = unserialize($script['params']);

				$role->setScripts($scripts);
			} else {
				
				if ($role->hasBehavior(ROLE_BEHAVIORS::NGINX)) {
					// Add nginx parameter
					$params[] = array(
						'name' => 'Nginx HTTPS Vhost Template',
						'type' => 'textarea',
						'required' => '1',
						'defval' => @file_get_contents(dirname(__FILE__)."/../templates/services/nginx/ssl.vhost.tpl")
					);
				
					$role->setParameters($params);
				}
			}
			
			// Set software
			if ($meta) {

				$software = array();
				foreach ((array)$meta['software'] as $soft)
					$software[$soft->name] = $soft->version;

				$role->setSoftware($software);
				
				$role->setTags((array)$meta['tags']);
				
				if ($BundleTask->platform == SERVER_PLATFORMS::NIMBULA) {
					$props = array(
						array('name' => self::PROPERTY_NIMBULA_INIT_ROOT_USER, 'value' => $meta['init_root_user']),
						array('name' => self::PROPERTY_NIMBULA_INIT_ROOT_PASS, 'value' => $meta['init_root_pass']),
						array('name' => self::PROPERTY_NIMBULA_ENTRY, 'value' => '')
					);
					foreach ($props as $prop)
						$role->setProperty($prop['name'], $prop['value']);
				}
			}

			return $role;
		}
	}
?>