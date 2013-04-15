<?php

class Scalr_UI_Controller_Tools_Aws_Vpc extends Scalr_UI_Controller
{
	public function hasAccess()
	{
		$enabledPlatforms = $this->getEnvironment()->getEnabledPlatforms();
		if (!in_array(SERVER_PLATFORMS::EC2, $enabledPlatforms))
			throw new Exception("You need to enable EC2 platform for current environment");

		return true;
	}

	public function xListViewSubnetsAction()
	{
		$aws = $this->getEnvironment()->aws($this->getParam('cloudLocation'));
		$subnets = $aws->ec2->subnet->describe();

		$retval = array();
		/* @var $subnet \Scalr\Service\Aws\Ec2\DataType\SubnetData  */
		foreach ($subnets as $subnet) {
			$retval[] = array(
				'id'          => $subnet->subnetId,
				'description' => "{$subnet->subnetId} ({$subnet->cidrBlock} in {$subnet->availabilityZone})"
			);
		}
		$this->response->data(array('success' => true, 'data' => $retval));
	}
}
