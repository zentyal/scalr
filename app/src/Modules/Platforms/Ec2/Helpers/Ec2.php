<?php

	class Modules_Platforms_Ec2_Helpers_Ec2
	{   		
		public static function farmSave(DBFarm $DBFarm, array $roles)
		{
			foreach ($roles as $DBFarmRole)
			{
				if ($DBFarmRole->Platform != SERVER_PLATFORMS::EC2)
					continue;
				
				$location = $DBFarmRole->CloudLocation;
				
				$sshKey = Scalr_Model::init(Scalr_Model::SSH_KEY);
				if (!$sshKey->loadGlobalByFarmId($DBFarm->ID, $location, SERVER_PLATFORMS::EC2))
				{
					$key_name = "FARM-{$DBFarm->ID}-".SCALR_ID;
						
					$AmazonEC2Client = Scalr_Service_Cloud_Aws::newEc2(
						$location, 
						$DBFarm->GetEnvironmentObject()->getPlatformConfigValue(Modules_Platforms_Ec2::PRIVATE_KEY), 
						$DBFarm->GetEnvironmentObject()->getPlatformConfigValue(Modules_Platforms_Ec2::CERTIFICATE)
					);
					
					$result = $AmazonEC2Client->CreateKeyPair($key_name);
					if ($result->keyMaterial)
					{	
						$sshKey->farmId = $DBFarm->ID;
						$sshKey->clientId = $DBFarm->ClientID;
						$sshKey->envId = $DBFarm->EnvID;
						$sshKey->type = Scalr_SshKey::TYPE_GLOBAL;
						$sshKey->cloudLocation = $location;
						$sshKey->cloudKeyName = $key_name;
						$sshKey->platform = SERVER_PLATFORMS::EC2;
						
						$sshKey->setPrivate($result->keyMaterial);
						
						$sshKey->save();
		            }
				}
			}
		}
		
		
		public static function farmValidateRoleSettings($settings, $rolename)
		{
			
		}
		
		public static function farmUpdateRoleSettings(DBFarmRole $DBFarmRole, $oldSettings, $newSettings)
		{
			
		}
		
		/**
		* // Creates a list of Amazon's security groups  
		* 
		*/
		public static function loadSecurityGroups()
		{  
		 	/*
						 	 
		       			
			$securityGroupSet = $AmazonEC2Client->DescribeSecurityGroups();
			
			$i = 0;			
			foreach($securityGroupSet->securityGroupInfo->item as $sgroup)			
			{  	 				
				$securityGroupNamesSet[$i]['name'] = (string)$sgroup->groupName;	
			    $i++;
			}
			
			return $securityGroupNamesSet;
			*/		
		}
	}

?>