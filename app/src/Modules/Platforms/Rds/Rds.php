<?php

use Scalr\Service\Aws\Rds\DataType\CreateDBInstanceRequestData;
use Scalr\Service\Aws\Rds\DataType\RestoreDBInstanceFromDBSnapshotRequestData;

class Modules_Platforms_Rds extends Modules_Platforms_Aws implements IPlatformModule
{
    private $db;

    /** Properties **/
    const ACCOUNT_ID 	= 'rds.account_id';
    const ACCESS_KEY	= 'rds.access_key';
    const SECRET_KEY	= 'rds.secret_key';
    const PRIVATE_KEY	= 'rds.private_key';
    const CERTIFICATE	= 'rds.certificate';

    /**
     * @var array
     */
    private $instancesListCache;

    public function __construct()
    {
        $this->db = Core::GetDBInstance();
    }

    /**
     * {@inheritdoc}
     * @see IPlatformModule::getRoleBuilderBaseImages()
     */
    public function getRoleBuilderBaseImages()
    {
    }

    public function getPropsList()
    {
        return array(
            self::ACCOUNT_ID	=> 'AWS Account ID',
            self::ACCESS_KEY	=> 'AWS Access Key',
            self::SECRET_KEY	=> 'AWS Secret Key',
            self::CERTIFICATE	=> 'AWS x.509 Certificate',
            self::PRIVATE_KEY	=> 'AWS x.509 Private Key'
        );
    }

    /**
     * {@inheritdoc}
     * @see IPlatformModule::GetServerCloudLocation()
     */
    public function GetServerCloudLocation(DBServer $DBServer)
    {
        return $DBServer->GetProperty(EC2_SERVER_PROPERTIES::REGION);
    }

    /**
     * {@inheritdoc}
     * @see IPlatformModule::GetServerID()
     */
    public function GetServerID(DBServer $DBServer)
    {
        return $DBServer->GetProperty(RDS_SERVER_PROPERTIES::INSTANCE_ID);
    }

    /**
     * {@inheritdoc}
     * @see IPlatformModule::GetServerFlavor()
     */
    public function GetServerFlavor(DBServer $DBServer)
    {
        return NULL;
    }

    /**
     * {@inheritdoc}
     * @see IPlatformModule::IsServerExists()
     */
    public function IsServerExists(DBServer $DBServer)
    {
        return in_array(
            $DBServer->GetProperty(RDS_SERVER_PROPERTIES::INSTANCE_ID),
            array_keys($this->GetServersList($DBServer->GetEnvironmentObject(), $DBServer->GetProperty(RDS_SERVER_PROPERTIES::REGION)))
        );
    }

    /**
     * {@inheritdoc}
     * @see IPlatformModule::GetServerIPAddresses()
     */
    public function GetServerIPAddresses(DBServer $DBServer)
    {
        $Client = $DBServer->GetClient();
        $aws = $DBServer->GetEnvironmentObject()->aws($DBServer->GetProperty(RDS_SERVER_PROPERTIES::REGION));
        /* @var $dbInstance \Scalr\Service\Aws\Rds\DataType\DBInstanceData */
        $dbInstance = $aws->rds->dbInstance->describe($DBServer->GetProperty(RDS_SERVER_PROPERTIES::INSTANCE_ID))->get(0);
        $hostname = $dbInstance->endpoint->address;
        $ip = @gethostbyname($hostname);
        if ($ip != $hostname) {
            return array(
            	'localIp'  => $ip,
            	'remoteIp' => $ip,
            );
        }
    }

    private function GetServersList(Scalr_Environment $environment, $region, $skipCache = false)
    {
        if (!isset($this->instancesListCache[$environment->id][$region])) {
            $aws = $environment->aws($region);
            try {
                $results = $aws->rds->dbInstance->describe();
            } catch (Exception $e) {
                throw new Exception(sprintf("Cannot get list of servers for platfrom rds: %s", $e->getMessage()));
            }
            if (isset($results)) {
            	foreach ($results as $dbInstance) {
            	    /* @var $dbInstance \Scalr\Service\Aws\Rds\DataType\DBInstanceData */
                	$this->instancesListCache[$environment->id][$region][$dbInstance->dBInstanceIdentifier] =
                	    $dbInstance->dBInstanceStatus;
            	}
            }
        }

        return $this->instancesListCache[$environment->id][$region];
    }

    /**
     * {@inheritdoc}
     * @see IPlatformModule::GetServerRealStatus()
     */
    public function GetServerRealStatus(DBServer $DBServer)
    {
        $region = $DBServer->GetProperty(RDS_SERVER_PROPERTIES::REGION);
        $env = $DBServer->GetEnvironmentObject();
        $dbInstanceIdentifier = $DBServer->GetProperty(RDS_SERVER_PROPERTIES::INSTANCE_ID);
        $aws = $env->aws($region);
        if (empty($this->instancesListCache[$env->id][$region][$dbInstanceIdentifier])) {
            try {
                $status = $aws->rds->dbInstance->describe($dbInstanceIdentifier)->get(0)->dBInstanceStatus;
            } catch (Exception $e) {
            	if (stristr($e->getMessage(), "not found"))
            		$status = 'not-found';
            	else
            		throw $e;
            }
        } else {
            $status = $this->instancesListCache[$env->id][$region][$dbInstanceIdentifier];
        }

        return Modules_Platforms_Rds_Adapters_Status::load($status);
    }

    /**
     * {@inheritdoc}
     * @see IPlatformModule::TerminateServer()
     */
    public function TerminateServer(DBServer $DBServer)
    {
        $DBServer
            ->GetEnvironmentObject()
            ->aws($DBServer->GetProperty(RDS_SERVER_PROPERTIES::REGION))
            ->rds->dbInstance->delete($DBServer->GetProperty(RDS_SERVER_PROPERTIES::INSTANCE_ID))
        ;
        return true;
    }

    /**
     * {@inheritdoc}
     * @see IPlatformModule::RebootServer()
     */
    public function RebootServer(DBServer $DBServer)
    {
        $DBServer
            ->GetEnvironmentObject()
            ->aws($DBServer->GetProperty(RDS_SERVER_PROPERTIES::REGION))
            ->rds->dbInstance->reboot($DBServer->GetProperty(RDS_SERVER_PROPERTIES::INSTANCE_ID))
        ;
        return true;
    }

    /**
     * {@inheritdoc}
     * @see IPlatformModule::RemoveServerSnapshot()
     */
    public function RemoveServerSnapshot(DBRole $DBRole)
    {
        foreach ($DBRole->getImageId(SERVER_PLATFORMS::EC2) as $location => $imageId) {
            $DBRole->getEnvironmentObject()->aws($location)->rds->dbSnapshot->delete($imageId);
        }
        return true;
    }

    /**
     * {@inheritdoc}
     * @see IPlatformModule::CheckServerSnapshotStatus()
     */
    public function CheckServerSnapshotStatus(BundleTask $BundleTask)
    {
        $DBServer = DBServer::LoadByID($BundleTask->serverId);
        try {
            /* @var $dbSnapshot \Scalr\Service\Aws\Rds\DataType\DBSnapshotData */
            $dbSnapshot = $DBServer
                ->GetEnvironmentObject()
                ->aws($DBServer->GetProperty(RDS_SERVER_PROPERTIES::REGION))
                ->rds->dbSnapshot->describe(null, $BundleTask->snapshotId)->get(0)
            ;
            if ($dbSnapshot->status == 'available') {
                $BundleTask->SnapshotCreationComplete($BundleTask->snapshotId);
            } elseif ($dbSnapshot->status == 'creating') {
                return;
            } else {
                Logger::getLogger(__CLASS__)->error("CheckServerSnapshotStatus ({$BundleTask->id}) status = {$dbSnapshot->status}");
            }
        } catch (Exception $e) {
            Logger::getLogger(__CLASS__)->fatal("CheckServerSnapshotStatus ({$BundleTask->id}): {$e->getMessage()}");
        }
    }

    /**
     * {@inheritdoc}
     * @see IPlatformModule::CreateServerSnapshot()
     */
    public function CreateServerSnapshot(BundleTask $BundleTask)
    {
        $DBServer = DBServer::LoadByID($BundleTask->serverId);
        $aws = $DBServer->GetEnvironmentObject()->aws($DBServer->GetProperty(RDS_SERVER_PROPERTIES::REGION));
        try {
            $aws->rds->dbSnapshot->create($DBServer->GetProperty(RDS_SERVER_PROPERTIES::INSTANCE_ID), $BundleTask->roleName);

        	$BundleTask->status = SERVER_SNAPSHOT_CREATION_STATUS::IN_PROGRESS;
        	$BundleTask->bundleType = SERVER_SNAPSHOT_CREATION_TYPE::RDS_SPT;
        	$BundleTask->snapshotId = $BundleTask->roleName;
        	$BundleTask->Log(sprintf(_("Snapshot creation initialized. SnapshotID: %s"), $BundleTask->snapshotId));
            $BundleTask->setDate('started');
            $BundleTask->Save();
        } catch (Exception $e) {
        	$BundleTask->SnapshotCreationFailed($e->getMessage());
        }
    }

    /**
     * {@inheritdoc}
     * @see IPlatformModule::GetServerConsoleOutput()
     */
    public function GetServerConsoleOutput(DBServer $DBServer)
    {
        throw new Exception("Not supported by RDS platform module");
    }

    /**
     * {@inheritdoc}
     * @see IPlatformModule::GetServerExtendedInformation()
     */
    public function GetServerExtendedInformation(DBServer $DBServer)
    {
        try {
            $aws = $DBServer->GetEnvironmentObject()->aws($DBServer->GetProperty(RDS_SERVER_PROPERTIES::REGION));
            $dbInstance = $aws->rds->dbInstance->describe($DBServer->GetProperty(RDS_SERVER_PROPERTIES::INSTANCE_ID))->get(0);

            $groups = array();
            if (!empty($dbInstance->dBParameterGroups)) {
                foreach ($dbInstance->dBParameterGroups as $pgitem) {
                    /* @var $pgitem \Scalr\Service\Aws\Rds\DataType\DBParameterGroupStatusData */
                    $groups[] = $pgitem->dBParameterGroupName;
                }
            }

        	$sgroups = array();
            if (!empty($dbInstance->dBSecurityGroups)) {
                foreach ($dbInstance->dBSecurityGroups as $sitem) {
                    /* @var $sitem \Scalr\Service\Aws\Rds\DataType\DBSecurityGroupMembershipData */
                    $groups[] = $sitem->dBSecurityGroupName;
                }
            }

            return array(
                'Instance ID'                  => $DBServer->GetProperty(RDS_SERVER_PROPERTIES::INSTANCE_ID),
                'Engine'                       => $dbInstance->engine,
                'Image ID (Snapshot)'          => $DBServer->GetProperty(RDS_SERVER_PROPERTIES::SNAPSHOT_ID),
                'Backup Retention Period'      => $dbInstance->backupRetentionPeriod,
                'Status'                       => $dbInstance->dBInstanceStatus,
                'Preferred Backup Window'      => $dbInstance->preferredBackupWindow,
                'Preferred Maintenance Window' => $dbInstance->preferredMaintenanceWindow,
                'Availability Zone'            => $dbInstance->availabilityZone,
                'Allocated Storage'            => $dbInstance->allocatedStorage,
                'Instance Class'               => $dbInstance->dBInstanceClass,
                'Master Username'              => $dbInstance->masterUsername,
                'Port'                         => $dbInstance->endpoint->port,
                'Hostname'                     => $dbInstance->endpoint->address,
                'Create Time'                  => $dbInstance->instanceCreateTime->format('c'),
                'Parameter groups'             => implode(", ", $groups),
                'Security groups'              => implode(", ", $sgroups)
            );
        } catch (Exception $e) {
        }

        return false;
    }

    /**
     * {@inheritdoc}
     * @see IPlatformModule::LaunchServer()
     */
    public function LaunchServer(DBServer $DBServer, Scalr_Server_LaunchOptions $launchOptions = null)
    {
        $aws = $DBServer->GetEnvironmentObject()->aws($DBServer->GetProperty(RDS_SERVER_PROPERTIES::REGION));

        $DBRole = DBRole::loadById($DBServer->roleId);

        $server_id = "scalr-{$DBServer->serverId}";

        $avail_zone = $DBServer->GetProperty(RDS_SERVER_PROPERTIES::AVAIL_ZONE) ?
            $DBServer->GetProperty(RDS_SERVER_PROPERTIES::AVAIL_ZONE) :
            $DBServer->GetProperty(RDS_SERVER_PROPERTIES::REGION) . "a";

        try {
            if ($DBRole->getImageId(SERVER_PLATFORMS::RDS, $DBServer->GetProperty(RDS_SERVER_PROPERTIES::REGION)) == 'ScalrEmpty') {
                $request = new CreateDBInstanceRequestData(
                    $server_id,
                    $DBServer->GetProperty(RDS_SERVER_PROPERTIES::STORAGE),
                    $DBServer->GetProperty(RDS_SERVER_PROPERTIES::INSTANCE_CLASS),
                    $DBServer->GetProperty(RDS_SERVER_PROPERTIES::INSTANCE_ENGINE),
                    $DBServer->GetProperty(RDS_SERVER_PROPERTIES::MASTER_USER),
                    $DBServer->GetProperty(RDS_SERVER_PROPERTIES::MASTER_PASS)
                );
                $request->port = $DBServer->GetProperty(RDS_SERVER_PROPERTIES::PORT);
                $request->availabilityZone = $avail_zone;

                $aws->rds->dbInstance->create($request);

            } else {
                $request = new RestoreDBInstanceFromDBSnapshotRequestData(
                    $server_id,
                    $DBRole->getImageId(SERVER_PLATFORMS::RDS, $DBServer->GetProperty(RDS_SERVER_PROPERTIES::REGION))
                );
                $request->dBInstanceClass = $DBServer->GetProperty(RDS_SERVER_PROPERTIES::INSTANCE_CLASS);
                $request->port = $DBServer->GetProperty(RDS_SERVER_PROPERTIES::PORT);
                $request->availabilityZone = $DBServer->GetProperty(RDS_SERVER_PROPERTIES::AVAIL_ZONE);

                $aws->rds->dbInstance->restoreFromSnapshot($request);

            }

            $DBServer->SetProperty(RDS_SERVER_PROPERTIES::INSTANCE_ID, $server_id);
            $DBServer->SetProperty(
                RDS_SERVER_PROPERTIES::SNAPSHOT_ID,
                $DBRole->getImageId(SERVER_PLATFORMS::RDS, $DBServer->GetProperty(RDS_SERVER_PROPERTIES::REGION))
            );

        } catch (Exception $e) {
        	throw new Exception(sprintf(_("Cannot launch new instance. %s"), $e->getMessage()));
        }

        return $DBServer;
    }

    /**
     * {@inheritdoc}
     * @see IPlatformModule::PutAccessData()
     */
    public function PutAccessData(DBServer $DBServer, Scalr_Messaging_Msg $message)
    {
    }

    /**
     * {@inheritdoc}
     * @see IPlatformModule::ClearCache()
     */
    public function ClearCache()
    {
        $this->instancesListCache = array();
    }
}
