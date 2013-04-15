<?php
namespace Scalr\Service\OpenStack;

use Scalr\Service\OpenStack\Services\VolumeService;
use Scalr\Service\OpenStack\Type\Marker;
use Scalr\Service\OpenStack\Exception\RestClientException;
use Scalr\Service\OpenStack\Client\AuthToken;
use Scalr\Service\OpenStack\Client\RestClient;
use Scalr\Service\OpenStack\Client\ClientInterface;
use Scalr\Service\OpenStack\Services\ServersService;
use Scalr\Service\OpenStack\Exception\OpenStackException;
use GlobIterator;
use FilesystemIterator;

/**
 * OpenStack api library
 *
 * @author   Vitaliy Demidov  <vitaliy@scalr.com>
 * @since    04.12.2012
 *
 * @property \Scalr\Service\OpenStack\Services\ServersService $servers  A Next Generation Cloud Servers service interface.
 * @property \Scalr\Service\OpenStack\Services\VolumeService  $volume   A Cloud Block Storage (Volume) service interface.
 */
class OpenStack
{
    /**
     * Available services
     * @var array
     */
    private static $availableServices;

    /**
     * Service instances cache
     * @var array
     */
    private $serviceInstances;

    /**
     * @var ClientInterface
     */
    private $client;

    /**
     * OpenStack config
     *
     * @var  OpenStackConfig
     */
    private $config;

    /**
     * Constructor
     *
     * @param OpenStackConfig $config OpenStack configuration object
     */
    public function __construct(OpenStackConfig $config)
    {
        $this->config = $config;
    }

    /**
     * Gets a list of available services
     *
     * @return  array Returns the list of available services looks like array(serviceName => className)
     */
    public static function getAvailableServices()
    {

        if (!isset(self::$availableServices)) {
            $ns = __NAMESPACE__ . '\\Services';
            $iterator = new GlobIterator(__DIR__ . '/Services/*Service.php', FilesystemIterator::KEY_AS_FILENAME);
            /* @var $item \SplFileInfo */
            foreach ($iterator as $item) {
                $class = $ns . '\\' . substr($iterator->key(), 0, -4);
                if (get_parent_class($class) == $ns . '\\AbstractService') {
                    self::$availableServices[$class::getName()] = $class;
                }
            }
        }
        return self::$availableServices;
    }

    /**
     * It's used to retrieve service interface instances as public properties
     */
    public function __get($name)
    {
        $available = self::getAvailableServices();
        if (isset($available[$name])) {
            if (!isset($this->serviceInstances[$name])) {
                $this->serviceInstances[$name] = new $available[$name] ($this);
            }
            return $this->serviceInstances[$name];
        }
        throw new OpenStackException(sprintf('Invalid Service name "%s" for the OpenStack', $name));
    }

    /**
     * Gets the OpenStack config
     *
     * @return  OpenStackConfig Returns OpenStack config
     */
    public function getConfig()
    {
        return $this->config;
    }

    /**
     * Gets Client
     *
     * @return  RestClient Returns RestClient
     */
    public function getClient()
    {
        if ($this->client === null) {
            $this->client = new RestClient($this->getConfig());
        }
        return $this->client;
    }

    /**
     * Performs an authentication request
     *
     * @return  object Returns auth token
     * @throws  RestClientException
     */
    public function auth()
    {
        return $this->getClient()->auth();
    }

    /**
     * List tenants action
     *
     * @param   Marker $marker  Marker Data.
     * @return  array  Return tenants list
     */
    public function listTenants(Marker $marker = null)
    {
        $result = null;
        if ($marker !== null) {
            $options = $marker->getQueryData();
        } else {
            $options = array();
        }
        $response = $this->getClient()->call($this->config->getIdentityEndpoint(), '/tenants', $options);
        if ($response->hasError() === false) {
            $result = json_decode($response->getContent());
            $result = $result->tenants;
        }
        return $result;
    }

    /**
     * Gets the list of available zones for the current endpoint
     *
     * @return  array Zones list looks like array(stdClass1, stdClass2, ...)
     */
    public function listZones()
    {
        $cfg = $this->getConfig();
        $client = $this->getClient();
        if (!($cfg->getAuthToken() instanceof AuthToken)) {
            $client->auth();
        }
        $ret = array();
        foreach ($cfg->getAuthToken()->getZones() as $regionName) {
            $obj = new \stdClass();
            $obj->name = $regionName;
            $ret[] = $obj;
            unset($obj);
        }
        return $ret;
    }
}