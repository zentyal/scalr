<?php

class Scalr_UI_Controller_Tools_Aws_Ec2_Billing extends Scalr_UI_Controller
{
	public function defaultAction()
	{
		$this->viewAction();
	}

	public function viewAction()
	{
		$this->response->page('ui/tools/aws/ec2/billing.js', array(
			'locations'	=> self::loadController('Platforms')->getCloudLocations(SERVER_PLATFORMS::EC2, false)
		));
	}
	
	public function xGetDetailsAction()
	{
		$amazonEC2Client = Scalr_Service_Cloud_Aws::newEc2(
			$this->getParam('cloudLocation'),
			$this->getEnvironment()->getPlatformConfigValue(Modules_Platforms_Ec2::PRIVATE_KEY),
			$this->getEnvironment()->getPlatformConfigValue(Modules_Platforms_Ec2::CERTIFICATE)
		);
		
		
		$rInstances = $amazonEC2Client->DescribeReservedInstances();
		$rInstances = $rInstances->reservedInstancesSet->item;
		if ($rInstances instanceof stdClass) $rInstances = array($rInstances);
		
		$result = array();
		foreach ($rInstances as $rInstance) {
			if ($rInstance->state == 'active') {
				$result[$rInstance->availabilityZone][$rInstance->instanceType]['rCount'] += $rInstance->instanceCount;
			}
		}
		
		$servers = $this->db->Execute("SELECT servers.server_id FROM `servers` INNER JOIN server_properties ON server_properties.server_id = servers.server_id 
			WHERE status=? AND name='ec2.region' AND env_id=? AND value=?", 
			array(SERVER_STATUS::RUNNING, $this->getEnvironmentId(), $this->getParam('cloudLocation'))
		);
		
		while ($server = $servers->FetchRow())
		{
			$dbServer = DBServer::LoadByID($server['server_id']);
			$result[$dbServer->GetProperty(EC2_SERVER_PROPERTIES::AVAIL_ZONE)][$dbServer->GetProperty(EC2_SERVER_PROPERTIES::INSTANCE_TYPE)]['iCount']++;
		}
		
		$retval = array();
		foreach ($result as $availZone => $i) {
			foreach ($i as $instanceType => $data) {
				$retval[] = array(
					'availZone' 	=> $availZone,
					'instanceType'	=> $instanceType,
					'scalrInstances'=> (int)$data['iCount'],
					'reservedInstances' => (int)$data['rCount']
				);
			}
		}
		
		$this->response->data(array('success' => true, 'data' => $retval));
	}
}
