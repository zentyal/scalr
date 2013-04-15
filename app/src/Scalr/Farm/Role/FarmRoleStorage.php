<?
namespace Scalr\Farm\Role;

class FarmRoleStorage
{
	protected $farmRole;
	protected $db;

	public function __construct(\DBFarmRole $dbFarmRole)
	{
		$this->db = \Core::GetDBInstance();
		$this->farmRole = $dbFarmRole;
	}

	/**
	 * @return FarmRoleStorageConfig[]
	 */
	public function getConfigs()
	{
		return FarmRoleStorageConfig::getByFarmRole($this->farmRole);
	}

	public function setConfigs(array $configs)
	{
		if (is_array($configs)) {
			foreach($configs as $value) {
				$config = new FarmRoleStorageConfig($this->farmRole);
				$config->create($value);
			}
		}
	}

    public function getVolumes($serverIndex = null)
    {
        $volumes = array();
        foreach ($this->getConfigs() as $config) {
            if (!$serverIndex)
                $volumes[$config->id] = FarmRoleStorageDevice::getByConfigId($config->id);
            else
                $volumes[$config->id][$serverIndex] = FarmRoleStorageDevice::getByConfigIdAndIndex($config->id, $serverIndex);
        }
        
        return $volumes;
    }
    
    /*
     * @param \DBServer $server
     * @param array volumes
     */
    public function setVolumes(\DBServer $server, $volumes)
    {
        $vlms = array();
        foreach ($volumes as $volume)
            $vlms[$volume->scalrStorageId] = $volume;
        
        foreach ($this->getConfigs() as $config) {
            if ($vlms[$config->id]) {
                $volume = new FarmRoleStorageDevice();
                if (!$volume->loadById($volume->id)) {
                    $volume->farmRoleId = $this->farmRole->ID;
                    $volume->storageConfigId = $config->id;
                    $volume->serverIndex = $server->index;
                    $volume->storageId = $vlms[$config->id]->id;
                    $volume->cloudLocation = $server->GetCloudLocation();
                    $volume->envId = $server->envId;
                }
            
                switch ($config->type) {
                    case FarmRoleStorageConfig::TYPE_RAID_EBS:
                        $volume->placement = $vlms[$config->id]->disks[0]->availZone;
                        break;
                        
                    case FarmRoleStorageConfig::TYPE_EBS:
                        $volume->placement = $vlms[$config->id]->availZone;
                        break;
                }
            
                $volume->config = $vlms[$config->id];
                $volume->status = FarmRoleStorageDevice::STATUS_ACTIVE;
                
                $volume->save();
                
                unset($vlms[$config->id]);
            } 
        }
        
        //TODO: Handle zombies
    }
    
    public function getVolumesConfigs($serverIndex)
    {
        $volumes = array();
        
        $configs = $this->getConfigs();
        foreach ($configs as $config) {
            //Check for existing volume
            $createFreshConfig = true;
	        $volume = null;
            $dbVolume = FarmRoleStorageDevice::getByConfigIdAndIndex($config->id, $serverIndex);
            if ($dbVolume) {
                 if ($config->reUse == 0) {
                     $dbVolume->status = FarmRoleStorageDevice::STATUS_ZOMBY;
                     $dbVolume->save();
                 } else {
                     $volume = $dbVolume->config;
                     $createFreshConfig = false;
                 }
            }
            
            if ($createFreshConfig) {
                $volume = new \stdClass();
                $volume->scalrStorageId = $config->id;
                $volume->type = stristr($config->type, "raid.") ? FarmRoleStorageConfig::TYPE_RAID : $config->type;
                $volume->fstype = $config->fs;
                $volume->mpoint = ($config->mount == 1) ? $config->mountPoint : null;
                
                switch ($config->type) {
                    case FarmRoleStorageConfig::TYPE_EBS:
                        $volume->size = $config->settings[FarmRoleStorageConfig::SETTING_EBS_SIZE];
                        
                        // IOPS
                        if ($config->settings[FarmRoleStorageConfig::SETTING_EBS_TYPE] != 'standard') {
                            $volume->volumeType = $config->settings[FarmRoleStorageConfig::SETTING_EBS_TYPE];
                            $volume->iops = $config->settings[FarmRoleStorageConfig::SETTING_EBS_IOPS];
                        }
                        
                        // SNAPSHOT
                        if ($config->settings[FarmRoleStorageConfig::SETTING_EBS_SNAPSHOT] != '') {
                            $volume->snap = new \stdClass();
                            $volume->snap->type = FarmRoleStorageConfig::TYPE_EBS;
                            $volume->snap->id = $config->settings[FarmRoleStorageConfig::SETTING_EBS_SNAPSHOT];
                        }
                        break;
                    case FarmRoleStorageConfig::TYPE_RAID_EBS:
                        $volume->level = $config->settings[FarmRoleStorageConfig::SETTING_RAID_LEVEL];
                        $volume->vg = $config->id;
                        $volume->disks = array();
                        for ($i = 1; $i <= $config->settings[FarmRoleStorageConfig::SETTING_RAID_VOLUMES_COUNT]; $i++) {
                            $disk = new \stdClass();
                            $disk->size = $config->settings[FarmRoleStorageConfig::SETTING_EBS_SIZE];
                            $disk->type = FarmRoleStorageConfig::TYPE_EBS;
                            
                            // IOPS
                            if ($config->settings[FarmRoleStorageConfig::SETTING_EBS_TYPE] != 'standard') {
                                $disk->volumeType = $config->settings[FarmRoleStorageConfig::SETTING_EBS_TYPE];
                                $disk->iops = $config->settings[FarmRoleStorageConfig::SETTING_EBS_IOPS];
                            }
                            
                            $volume->disks[] = $disk;
                        }
                        
                        break;
                        
                    //TODO: add support for cinder, csvol and raids for them. Probably add manager for ephemeral devices.
                }
            }

            $volumes[] = $volume;
        }

        return $volumes;    
    }
}
