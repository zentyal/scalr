<?php

class Scalr_Service_Cloud_Aws
{

	/**
	 *
	 * Amazon IAM Client
	 * @param string $access_key
	 * @param string $secret_key
	 * @return Scalr_Service_Cloud_Aws_Iam_Client
	 */
	public static function newIam($access_key, $secret_key)
	{
		$iam = new Scalr_Service_Cloud_Aws_Iam_Client($secret_key, $access_key);
		return $iam;
	}

	/**
	 * @return AmazonEC2
	 * @deprecated This method has been deprecated since 22.02.2013 and will be turned down soon.
	 */
	public static function newEc2($region, $privateKey, $certificate)
	{
		//TODO remove deprecated method Scalr_Service_Cloud_Aws::newEc2 after rewriting code to new library [SCALRCORE-267]
		$ec2 = AmazonEC2::GetInstance(AWSRegions::GetAPIURL($region));
		$ec2->SetAuthKeys($privateKey, $certificate);
		return $ec2;
	}
}