<?php

use Scalr\Service\Aws\Ec2\DataType\SnapshotFilterNameType;
use Scalr\Service\Aws\Ec2\DataType\SnapshotData;

class Scalr_UI_Controller_Platforms_Ec2 extends Scalr_UI_Controller
{
	public function xGetAvailZonesAction()
	{
		$aws = $this->getEnvironment()->aws($this->getParam('cloudLocation'));
		// Get Avail zones
		$response = $aws->ec2->availabilityZone->describe();
		$data = array();
		/* @var $zone \Scalr\Service\Aws\Ec2\DataType\AvailabilityZoneData */
		foreach ($response as $zone) {
			$data[] = array(
				'id'    => (string)$zone->zoneName,
				'name'  => (string)$zone->zoneName,
				'state' => (string)$zone->zoneState,
			);
		}
		/*
		if ($this->getParam('roleId')) {
			$dbRole = DBRole::loadById($this->getParam('roleId'));
			$locations = $dbRole->getCloudLocations($this->getParam('platform'));
			$data['locations'] = $locations;
		}
		*/
		$this->response->data(array('data' => $data));
	}

	public function xGetFarmRoleElasicIpsAction()
	{
		$aws = $this->getEnvironment()->aws($this->getParam('cloudLocation'));

		$map = array();
		if ($this->getParam('farmRoleId')) {
			$dbFarmRole = DBFarmRole::LoadByID($this->getParam('farmRoleId'));
			$this->user->getPermissions()->validate($dbFarmRole);

			$maxInstances = $dbFarmRole->GetSetting(DBFarmRole::SETTING_SCALING_MAX_INSTANCES);
			for ($i = 1; $i <= $maxInstances; $i++) {
				$map[] = array('serverIndex' => $i);
			}

			$servers = $dbFarmRole->GetServersByFilter();
			for ($i = 0; $i < count($servers); $i++) {
				if ($servers[$i]->status != SERVER_STATUS::TERMINATED && $servers[$i]->index) {
					$map[$servers[$i]->index - 1]['serverIndex'] = $servers[$i]->index;
					$map[$servers[$i]->index - 1]['serverId'] = $servers[$i]->serverId;
					$map[$servers[$i]->index - 1]['remoteIp'] = $servers[$i]->remoteIp;
					$map[$servers[$i]->index - 1]['instanceId'] = $servers[$i]->GetProperty(EC2_SERVER_PROPERTIES::INSTANCE_ID);
				}
			}

			$ips = $this->db->GetAll('SELECT ipaddress, instance_index FROM elastic_ips WHERE farm_roleid = ?', array($dbFarmRole->ID));
			for ($i = 0; $i < count($ips); $i++) {
				$map[$ips[$i]['instance_index'] - 1]['elasticIp'] = $ips[$i]['ipaddress'];
			}
		}

		$response = $aws->ec2->address->describe();

		$ips = array();
		/* @var $ip \Scalr\Service\Aws\Ec2\DataType\AddressData */
		foreach ($response as $ip) {
			$itm = array(
				'ipAddress'  => $ip->publicIp,
				'instanceId' => $ip->instanceId,
			);

			$info = $this->db->GetRow("
				SELECT * FROM elastic_ips WHERE ipaddress = ?
			", array($itm['ipAddress']));

			if ($info) {
				try {
					if ($info['server_id'] && $itm['instanceId']) {
						$dbServer = DBServer::LoadByID($info['server_id']);
						if ($dbServer->GetProperty(EC2_SERVER_PROPERTIES::INSTANCE_ID) != $itm['instanceId']) {
							for ($i = 0; $i < count($map); $i++) {
								if ($map[$i]['elasticIp'] == $itm['ipAddress'])
									$map[$i]['warningInstanceIdDoesntMatch'] = true;
							}
						}
					}

					$farmRole = DBFarmRole::LoadByID($info['farm_roleid']);
					$this->user->getPermissions()->validate($farmRole);

					$itm['roleName'] = $farmRole->GetRoleObject()->name;
					$itm['farmName'] = $farmRole->GetFarmObject()->Name;
					$itm['serverIndex'] = $info['instance_index'];
				} catch (Exception $e) {}
			}
			$ips[] = $itm;
		}

		$this->response->data(array('data' => array(
			'map' => $map,
			'ips' => $ips
		)));
	}

	public function xGetSnapshotsAction()
	{
		$aws = $this->getEnvironment()->aws($this->getParam('cloudLocation'));

		$response = $aws->ec2->snapshot->describe(null, null, array(array(
			'name'  => SnapshotFilterNameType::ownerId(),
			'value' => $this->getEnvironment()->getPlatformConfigValue(Modules_Platforms_Ec2::ACCOUNT_ID),
		)));

		$data = array();
		/* @var $pv \Scalr\Service\Aws\Ec2\DataType\SnapshotData */
		foreach ($response as $pv) {
			if ($pv->status == SnapshotData::STATUS_COMPLETED) {
				$data[] = array(
					// old format
					'snapid'        => $pv->snapshotId,
					'createdat'     => Scalr_Util_DateTime::convertTz($pv->startTime),
					'size'          => $pv->volumeSize,
					// new format
					'snapshotId'    => $pv->snapshotId,
					'createdDate'   => Scalr_Util_DateTime::convertTz($pv->startTime),
					'size'          => $pv->volumeSize,
					'volumeId'      => $pv->volumeId,
					'description'   => (string)$pv->description,
				);
			}
		}

		$this->response->data(array('data' => $data));
	}

	public function xGetVpcListAction()
	{
		$aws = $this->getEnvironment()->aws($this->getParam('cloudLocation'));

		$vpcList = $aws->ec2->vpc->describe();
		$rows = array();
		/* @var $vpcData Scalr\Service\Aws\Ec2\DataType\VpcData */
		foreach ($vpcList as $vpcData) {
			$rows[] = array(
				'id'   => $vpcData->vpcId,
				'name' => 'test - ' . $vpcData->vpcId,
			);
		}

		$this->response->data(array(
			'vpc' => $rows,
		));
	}
}
