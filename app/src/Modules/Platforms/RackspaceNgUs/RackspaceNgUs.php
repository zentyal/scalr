<?php
	class Modules_Platforms_RackspaceNgUs extends Modules_Platforms_Openstack implements IPlatformModule
	{
		
        const EXT_IS_ACCOUNT_MANAGED    = 'ext.is_account_managed';
        
        public function __construct($platform = SERVER_PLATFORMS::RACKSPACENG_US)
        {
            parent::__construct($platform);
        }
            
            
		public function getLocations()
        {
            return array(
                'ORD' => 'Rackspace US / ORD',
                'DFW' => 'Rackspace US / DFW'
            );
        }
        
        public function getRoleBuilderBaseImages()
        {
            $images = array(
                '5cebb13a-f783-4f8c-8058-c4182c724ccd' => array('name' => 'Ubuntu 12.04', 'os_dist' => 'ubuntu', 'location' => 'DFW', 'architecture' => 'x86_64'),
                'c195ef3b-9195-4474-b6f7-16e5bd86acd0' => array('name' => 'CentOS 6.3', 'os_dist' => 'centos', 'location' => 'DFW', 'architecture' => 'x86_64'),
                //'d6dd6c70-a122-4391-91a8-decb1a356549' => array('name' => 'RHEL 6.1', 'os_dist' => 'rhel', 'location' => 'DFW', 'architecture' => 'x86_64'),
                
                'ORD-5cebb13a-f783-4f8c-8058-c4182c724ccd' => array('name' => 'Ubuntu 12.04', 'os_dist' => 'ubuntu', 'location' => 'ORD', 'architecture' => 'x86_64'),
                'ORD-c195ef3b-9195-4474-b6f7-16e5bd86acd0' => array('name' => 'CentOS 6.3', 'os_dist' => 'centos', 'location' => 'ORD', 'architecture' => 'x86_64'),
                //'ORD-d6dd6c70-a122-4391-91a8-decb1a356549' => array('name' => 'RHEL 6.1', 'os_dist' => 'rhel', 'location' => 'ORD', 'architecture' => 'x86_64'),
            );
                
            return $images;
        }
        
        public function GetServerIPAddresses(DBServer $DBServer)
        {
            $client = $this->getOsClient($DBServer->GetEnvironmentObject(), $DBServer->GetProperty(OPENSTACK_SERVER_PROPERTIES::CLOUD_LOCATION));
            $result = $client->servers->getServerDetails($DBServer->GetProperty(OPENSTACK_SERVER_PROPERTIES::SERVER_ID));
            
            if ($result->accessIPv4)
                $remoteIp = $result->accessIPv4;
            
            if (!$remoteIp) {
                foreach ($result->addresses->public as $addr)
                    if ($addr->version == 4) {
                        $remoteIp = $addr->addr;
                        break;
                    }
            }
                
            foreach ($result->addresses->private as $addr)
                if ($addr->version == 4) {
                    $localIp = $addr->addr;
                    break;
                }

            if (!$localIp)
                $localIp = $remoteIp;
                    
            return array(
                'localIp'   => $localIp,
                'remoteIp'  => $remoteIp
            );
        }
	}
