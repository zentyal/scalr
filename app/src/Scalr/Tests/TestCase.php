<?php
namespace Scalr\Tests;

use Scalr\Tests\Constraint\ArrayHas;

/**
 * Basic TestCase class
 *
 * @author    Vitaliy Demidov   <vitaliy@scalr.com>
 * @since     03.12.2012
 */
abstract class TestCase extends \PHPUnit_Framework_TestCase
{

    /**
     * {@inheritdoc}
     * @see PHPUnit_Framework_TestCase::setUp()
     */
    protected function setUp()
    {
        parent::setUp();
    }

    /**
     * {@inheritdoc}
     * @see PHPUnit_Framework_TestCase::tearDown()
     */
    protected function tearDown()
    {
        parent::tearDown();
    }

    /**
     * Returns true if functional tests should be skipped.
     *
     * @return  bool Returns true if functional tests should be skipped.
     */
    public function isSkipFunctionalTests()
    {
        return isset(\CONFIG::$PHPUNIT_SKIP_FUNCTIONAL_TESTS) && \CONFIG::$PHPUNIT_SKIP_FUNCTIONAL_TESTS ||
               !isset(\CONFIG::$PHPUNIT_SKIP_FUNCTIONAL_TESTS) ;
    }

    /**
     * Returns fixtures directory
     *
     * @return string Returns fixtures directory
     */
    public function getFixturesDirectory()
    {
        return __DIR__ . '/Fixtures';
    }

    /**
     * Decamilizes string
     *
     * @param   string   $input
     * @return  string   Returns decamelized string
     */
    public function decamilize($input)
    {
    $u = preg_replace_callback('/(_|^)([^_]+)/', function($c){
        return ucfirst(strtolower($c[2]));
    }, $input);
    return $u;
    }

    /**
     * Constraints that array has key and value
     *
     * @param   mixed              $value   Expected array value
     * @param   string             $key     Expected array key
     * @param   array|\ArrayAccess $arr     An array which needs to be evaluated
     * @param   string             $message Message
     */
    public static function assertArrayHas($value, $key, $arr, $message = '')
    {
        self::assertThat($arr, new ArrayHas(self::equalTo($value), $key), $message);
    }

    /**
     * Retrieves unique session id.
     *
     * This number is unique per each test execution.
     *
     * @return  string Returns unique session id.
     */
    protected static function getSessionId()
    {
        static $s = null;
        if (!isset($s)) {
            $s = substr(uniqid(), 0, 6);
        }
        return $s;
    }

    /**
     * Retrieves ID of the Scalr installation.
     *
     * It is used for isolation the functional tests of
     * third party services like AWS, OpenStack ... etc
     *
     * @return  string Returns ID of the Scalr installation
     */
    protected static function getInstallationId()
    {
        if (!defined('SCALR_ID')) {
            throw new \Exception('SCALR_ID is not defined!');
        }
        return \SCALR_ID;
    }

    /**
     * Gets test name
     *
     * @param   string $suffix optional Name suffix
     * @return  string Returns test name
     */
    public static function getTestName($suffix = '')
    {
        return 'phpunit' . (!empty($suffix) ? '-' . $suffix : '') . '-' . self::getInstallationId();
    }
}