<?php
namespace Scalr\Tests\Service\OpenStack;

use Scalr\Service\OpenStack\Services\Servers\Type\Personality;
use Scalr\Service\OpenStack\Services\Servers\Type\PersonalityList;
use Scalr\Service\OpenStack\Services\Volume\Type\VolumeStatus;
use Scalr\Service\OpenStack\Exception\OpenStackException;
use Scalr\Service\OpenStack\Services\Servers\Type\ServersExtension;
use Scalr\Service\OpenStack\Exception\RestClientException;
use Scalr\Service\OpenStack\Services\Servers\Type\ListServersFilter;
use Scalr\Service\OpenStack\Services\Servers\Type\ImageStatus;
use Scalr\Service\OpenStack\Services\Servers\Type\ListImagesFilter;
use Scalr\Service\OpenStack\OpenStackConfig;
use Scalr\Service\OpenStack\Type\AppFormat;
use Scalr\Service\OpenStack\OpenStack;

/**
 * OpenStack TestCase
 *
 * @author   Vitaliy Demidov  <vitaliy@scalr.com>
 * @since    05.12.2012
 */
class OpenStackTest extends OpenStackTestCase
{

    const OPENSTACK_TEST_IMAGE_ID = '13d55079-cd3a-4955-8b84-892b06d9b7e6';
    const OPENSTACK_TEST_REGION = 'vega';

    const RACKSPACE_NG_US_TEST_IMAGE_ID = '3afe97b2-26dc-49c5-a2cc-a2fc8d80c001';
    const RACKSPACE_NG_US_TEST_REGION = 'DFW';

    const RACKSPACE_NG_UK_TEST_IMAGE_ID = '3afe97b2-26dc-49c5-a2cc-a2fc8d80c001';
    const RACKSPACE_NG_UK_TEST_REGION = 'LON';

    /**
     * Gets test server name
     *
     * @param   string $suffix optional Name suffix
     * @return  string Returns test server name
     */
    public static function getTestServerName($suffix = '')
    {
        return self::getTestName('server' . (!empty($suffix) ? '-' . $suffix : ''));
    }

    /**
     * Gets test volume name
     *
     * @param   string $suffix optional Name suffix
     * @return  string Returns test volume name
     */
    public static function getTestVolumeName($suffix = '')
    {
        return self::getTestName('volume' . (!empty($suffix) ? '-' . $suffix : ''));
    }

    /**
     * Gets test snapshot name
     *
     * @param   string $suffix optional Name suffix
     * @return  string Returns test snapshot name
     */
    public static function getTestSnapshotName($suffix = '')
    {
        return self::getTestName('snapshot' . (!empty($suffix) ? '-' . $suffix : ''));
    }

    /**
     * {@inheritdoc}
     * @see Scalr\Tests\Service\OpenStack.OpenStackTestCase::setUp()
     */
    protected function setUp()
    {
        parent::setUp();
    }

    /**
     * {@inheritdoc}
     * @see Scalr\Tests\Service\OpenStack.OpenStackTestCase::tearDown()
     */
    protected function tearDown()
    {
        parent::tearDown();
    }

    /**
     * @test
     */
    public function testGetAvailableServices()
    {
        $avail = OpenStack::getAvailableServices();
        $this->assertNotEmpty($avail);
        $this->assertInternalType('array', $avail);
        $this->assertArrayHasKey('servers', $avail);
        $this->assertArrayNotHasKey('abstract', $avail);
    }

    /**
     * Provider of the instances for the functional tests
     */
    public function providerRs()
    {
        return array(
            array(\SERVER_PLATFORMS::OPENSTACK, self::OPENSTACK_TEST_REGION, self::OPENSTACK_TEST_IMAGE_ID),
            array(\SERVER_PLATFORMS::RACKSPACENG_US, self::RACKSPACE_NG_US_TEST_REGION, self::RACKSPACE_NG_US_TEST_IMAGE_ID),
            array(\SERVER_PLATFORMS::RACKSPACENG_UK, self::RACKSPACE_NG_UK_TEST_REGION, self::RACKSPACE_NG_UK_TEST_IMAGE_ID),
        );
    }

    /**
     * @test
     * @dataProvider providerRs
     */
    public function testFunctionalOpenStack($platform, $region, $imageId)
    {
        if ($this->isSkipFunctionalTests()) {
            $this->markTestSkipped();
        }
        /* @var $rs OpenStack */
        if ($this->getContainer()->environment->isPlatformEnabled($platform)) {
            $rs = $this->getContainer()->openstack($platform, $region);
            $this->assertInstanceOf($this->getOpenStackClassName('OpenStack'), $rs);
        } else {
            //Environment has not been activated yet.
            $this->markTestSkipped(sprintf('Environment for the "%s" platform has not been activated.', $platform));
        }

        $os = $this->getContainer()->openstack($platform, 'INVALID-REGION-TEST');
        try {
            $ext = $os->servers->listExtensions();
            unset($os);
            $this->assertTrue(false, 'An exception must be thrown in this test');
        } catch (OpenStackException $e) {
            $this->assertTrue(true);
        }
        unset($os);

        //Activates rest client debug output
        $one = $rs->servers;
        $this->assertInstanceOf($this->getOpenStackClassName('Services\\ServersService'), $one);
        $two = $rs->servers;
        $this->assertInstanceOf($this->getOpenStackClassName('Services\\ServersService'), $two);
        $this->assertSame($one, $two, 'Service interface is expected to be cached within each separate OpenStack instance.');

        $aZones = $rs->listZones();
        $this->assertNotEmpty($aZones);
        unset($aZones);

        //List tenants test
        $tenants = $rs->listTenants();
        $this->assertNotEmpty($tenants);
        $this->assertTrue(is_array($tenants));
        unset($tenants);

        //Get Limits test
        $limits = $rs->servers->getLimits();
        $this->assertTrue(is_object($limits));
        unset($limits);

        $aExtensions = $rs->servers->listExtensions();
        $this->assertTrue(is_array($aExtensions));
        unset($aExtensions);

        //List snapshots test
        $snList = $rs->volume->snapshots->list();
        $this->assertTrue(is_array($snList));
        foreach ($snList as $v) {
            if ($v->display_name == self::getTestSnapshotName()) {
                $rs->volume->snapshots->delete($v->id);
            }
        }
        unset($snList);

        //List Volume Types test
        $volumeTypes = $rs->volume->listVolumeTypes();
        $this->assertTrue(is_array($volumeTypes));
        foreach ($volumeTypes as $v) {
            $volumeTypeDesc = $rs->volume->getVolumeType($v->id);
            $this->assertTrue(is_object($volumeTypeDesc));
            unset($volumeTypeDesc);
            break;
        }

        //List Volumes test
        $aVolumes = $rs->volume->listVolumes();
        $this->assertTrue(is_array($aVolumes));
        foreach ($aVolumes as $v) {
            if ($v->display_name == self::getTestVolumeName()) {
                if (in_array($v->status, array(VolumeStatus::STATUS_AVAILABLE, VolumeStatus::STATUS_ERROR))) {
                    $ret = $rs->volume->deleteVolume($v->id);
                } else {
                    printf("\nVolume id:%s has status '%s'. Display name is %s\n", $v->id, $v->status, $v->display_name);
                }
            }
        }

        //Create Volume test
// 		$volume = $rs->volume->createVolume(100, self::getTestVolumeName());
// 		$this->assertTrue(is_object($volume));
// 		$this->assertNotEmpty($volume->id);

// 		$maxTimeout = 300;
// 		$sleep = 2;
// 		while (!in_array($volume->status, array(VolumeStatus::STATUS_AVAILABLE, VolumeStatus::STATUS_ERROR))) {
// 			sleep($sleep);
// 			$volume = $rs->volume->getVolume($volume->id);
// 			$this->assertTrue(is_object($volume));
// 			$this->assertNotEmpty($volume->id);
// 			$maxTimeout -= $sleep;
// 			$sleep = $sleep * 2;
// 			if ($maxTimeout <= 0) break;
// 		}
// 		$this->assertTrue(in_array($volume->status, array(VolumeStatus::STATUS_AVAILABLE, VolumeStatus::STATUS_ERROR)));

// 		//Too long running test
// 		//Create snapshot test
// 		$snap = $rs->volume->snapshots->create($volume->id, self::getTestSnapshotName());
// 		$this->assertTrue(is_object($snap));
// 		$this->assertNotEmpty($snap->id);

// 		$maxTimeout = 400;
// 		$sleep = 3;
// 		while (!in_array($snap->status, array('available', 'error'))) {
// 			sleep($sleep);
// 			$snap = $rs->volume->snapshots->get($snap->id);
// 			$this->assertNotEmpty($snap->id);
// 			$maxTimeout -= $sleep;
// 			$sleep = $sleep * 2;
// 			if ($maxTimeout <= 0) break;
// 		}
// 		$this->assertTrue(in_array($snap->status, array('available', 'error')));
// 		//Delete snapshot test
// 		$ret = $rs->volume->snapshots->delete($snap->id);
// 		$this->assertTrue($ret);
// 		unset($snap);

        //Delete Volume test
// 		$ret = $rs->volume->deleteVolume($volume->id);
// 		$this->assertTrue($ret);
// 		unset($volume);

        if ($rs->servers->isExtensionSupported(ServersExtension::floatingIpPools())) {
            $aFloatingIpPools = $rs->servers->listFloatingIpPools();
            $this->assertTrue(is_array($aFloatingIpPools));
            unset($aFloatingIpPools);
        }
        if ($rs->servers->isExtensionSupported(ServersExtension::floatingIps())) {
            $aFloatingIps = $rs->servers->floatingIps->list();
            $this->assertTrue(is_array($aFloatingIps));
            foreach ($aFloatingIps as $v) {
                $r = $rs->servers->floatingIps->get($v->id);
                $this->assertTrue(is_object($r));
                break;
            }
            unset($aFloatingIps);

            $fip = $rs->servers->floatingIps->create('nova');
            $this->assertTrue(is_object($fip));
            $r = $rs->servers->floatingIps->delete($fip->id);
            $this->assertTrue($r);
            try {
                //Verifies that ip has been successfully removed
                $res = $rs->servers->floatingIps->get($fip->id);
                $this->assertTrue(false, 'Exception must be thrown here');
            } catch (RestClientException $e) {
                if ($e->error->code == 404) {
                    $this->assertTrue(true);
                } else throw $e;
            }
            unset($fip);
        }

        //List flavors test
        $flavorsList = $listFlavors = $rs->servers->listFlavors();
        $this->assertTrue(is_array($flavorsList));
        unset($flavorsList);

        //List servers test
        $ret = $rs->servers->list();
        $this->assertTrue(is_array($ret));
        if (!empty($ret)) {
            foreach ($ret as $v) {
                if ($v->name == self::getTestServerName() || $v->name == self::getTestServerName('renamed')) {
                    //Removes servers
                    try {
                        $rs->servers->deleteServer($v->id);
                    } catch (RestClientException $e) {
                        echo $e->getMessage() . "\n";
                    }
                }
            }
        }

        $personality = new PersonalityList(array(
            new Personality('/etc/scalr/private.d/.user-data', base64_encode('super data'))
        ));
        //Create server test
        $srv = $rs->servers->createServer(
            self::getTestServerName(), '2', $imageId, null, null, $personality, null
        );
        $this->assertInstanceOf('stdClass', $srv);

        $srv = $rs->servers->getServerDetails($srv->id);
        $this->assertInstanceOf('stdClass', $srv);
        $this->assertNotEmpty($srv->status);

        $maxTimeout = 900;
        $sleep = 3;
        while (!in_array($srv->status, array('ACTIVE', 'ERROR'))) {
            sleep($sleep);
            $srv = $rs->servers->getServerDetails($srv->id);
            $maxTimeout -= $sleep;
            $sleep = $sleep * 2;
            if ($maxTimeout <= 0) break;
        }
        $this->assertTrue(in_array($srv->status, array('ACTIVE', 'ERROR')));
        $this->assertContains($srv->status, array('ACTIVE', 'ERROR'));

        if ($rs->servers->isExtensionSupported(ServersExtension::consoleOutput())) {
            $consoleOut = $rs->servers->getConsoleOutput($srv->id, 50);
        }

        //List Addresses test
        $addresses = $rs->servers->listAddresses($srv->id);
        $this->assertTrue(is_object($addresses));

        //Get server details test
        $srvDetails = $rs->servers->getServerDetails($srv->id);
        $this->assertInstanceOf('stdClass', $srvDetails);
        unset($srvDetails);

        //Images List test
        $imagesList = $rs->servers->images->list();
        $this->assertTrue(is_array($imagesList));
        foreach ($imagesList as $img) {
            if ($img->name == self::getTestName('image')) {
                $rs->servers->images->delete($img->id);
            }
            $imageDetails = $rs->servers->images->get($img->id);
            $this->assertTrue(is_object($imageDetails));
            unset($imageDetails);
            break;
        }
        unset($imagesList);

        //Keypairs extension test
        if ($rs->servers->isExtensionSupported(ServersExtension::keypairs())) {
            $aKeypairs = $rs->servers->keypairs->list();
            $this->assertTrue(is_array($aKeypairs));
            foreach ($aKeypairs as $v) {
                if ($v->keypair->name == self::getTestName('key')) {
                    $rs->servers->keypairs->delete($v->keypair->name);
                }
            }
            unset($aKeypairs);
            $kp = $rs->servers->keypairs->create(self::getTestName('key'));
            $this->assertNotEmpty($kp);
            $this->assertTrue(is_object($kp));

            $kptwin = $rs->servers->keypairs->get($kp->name);
            $this->assertNotEmpty($kptwin);
            $this->assertEquals($kp->public_key, $kptwin->public_key);
            unset($kptwin);

            $res = $rs->servers->keypairs->delete($kp->name);
            $this->assertTrue($res);
            unset($kp);
        }

        //Security Groups extension test
        if ($rs->servers->isExtensionSupported(ServersExtension::securityGroups())) {
            $listSecurityGroups = $rs->servers->securityGroups->list();
            $this->assertTrue(is_array($listSecurityGroups));
            foreach ($listSecurityGroups as $v) {
                if ($v->name == self::getTestName('security-group')) {
                    $rs->servers->securityGroups->delete($v->id);
                }
            }
            unset($listSecurityGroups);

            $listForSpecificServer = $rs->servers->securityGroups->list($srv->id);
            $this->assertTrue(is_array($listForSpecificServer));
            unset($listForSpecificServer);

            $sg = $rs->servers->securityGroups->create(self::getTestName('security-group'), 'This is phpunit security group test.');
            $this->assertNotEmpty($sg);
            $this->assertTrue(is_object($sg));

            $sgmirror = $rs->servers->securityGroups->get($sg->id);
            $this->assertNotEmpty($sgmirror);
            $this->assertEquals($sg->id, $sgmirror->id);
            unset($sgmirror);

            $sgrule = $rs->servers->securityGroups->addRule(array(
                "ip_protocol"     => "tcp",
                "from_port"       => "80",
                "to_port"         => "8080",
                "cidr"            => "0.0.0.0/0",
                "parent_group_id" => $sg->id,
            ));
            $this->assertNotEmpty($sgrule);
            $this->assertTrue(is_object($sgrule));
            $this->assertEquals($sg->id, $sgrule->parent_group_id);

            $ret = $rs->servers->securityGroups->deleteRule($sgrule->id);
            $this->assertTrue($ret);
            unset($sgrule);

            $ret = $rs->servers->securityGroups->delete($sg->id);
            $this->assertTrue($ret);
        }

// 		$imageId = $rs->servers->images->create($srv->id, self::getTestName('image'));
// 		$this->assertTrue(is_string($imageId));

        //It requires ACTIVE state of server
// 		$res = $rs->servers->resizeServer($srv->id, $srv->name, '3');
// 		$this->assertTrue($res);

// 		$res = $rs->servers->confirmResizedServer($srv->id);
// 		$this->assertTrue($res);

        //Update server test
        $renamedDetails = $rs->servers->updateServer($srv->id, self::getTestServerName('renamed'));
        $this->assertInstanceOf('stdClass', $renamedDetails);
        $this->assertEquals(self::getTestServerName('renamed'), $renamedDetails->server->name);
        unset($renamedDetails);

        //Delete Server test
        $ret = $rs->servers->deleteServer($srv->id);
        $this->assertTrue($ret);
    }
}