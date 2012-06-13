<?php

class Scalr_UI_Controller_Platforms_Openstack extends Scalr_UI_Controller
{
	public function xGetFlavorsAction()
	{
		$os = Scalr_Service_Cloud_Openstack::newNovaCC(
			$this->getEnvironment()->getPlatformConfigValue(Modules_Platforms_Openstack::API_URL, true, $this->getParam('cloudLocation')),
			$this->getEnvironment()->getPlatformConfigValue(Modules_Platforms_Openstack::USERNAME, true, $this->getParam('cloudLocation')),
			$this->getEnvironment()->getPlatformConfigValue(Modules_Platforms_Openstack::API_KEY, true, $this->getParam('cloudLocation')),
			$this->getEnvironment()->getPlatformConfigValue(Modules_Platforms_Openstack::PROJECT_NAME, true, $this->getParam('cloudLocation'))
		);
		
		$data = array();
		foreach ($os->flavorsList(true)->flavors as $flavor) {
			$data[] = array(
				'id' => $flavor->id,
				'name' => sprintf('RAM: %s MB Disk: %s GB', $flavor->ram, $flavor->disk)
			);
		}

		$this->response->data(array('data' => $data));
	}
}
