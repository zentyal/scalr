<?php

namespace Scalr\Service\Aws\Ec2\DataType;

use Scalr\Service\Aws\Ec2Exception;
use Scalr\Service\Aws\Ec2\AbstractEc2DataType;
use \DateTime;

/**
 * BlockDeviceMappingData
 *
 * @author   Vitaliy Demidov   <vitaliy@scalr.com>
 * @since    17.01.2013
 *
 * @property \Scalr\Service\Aws\Ec2\DataType\EbsBlockDeviceData $ebs Parameters used to automatically set up Amazon EBS
 *                                                                   volumes when the instance is launched.
 */
class BlockDeviceMappingData extends AbstractEc2DataType
{

    /**
     * List of the public properties
     * which is managed by magic getter and setters internally.
     *
     * @var  array
     */
    protected $_properties = array('ebs');

    /**
     * The device name exposed to the instance (e.g., /dev/sdh).
     * @var string
     */
    public $deviceName;

    /**
     * The virtual device name.
     * @var string
     */
    public $virtualName;

    /**
     * Include this empty element to suppress the specified device included
     * in the block device mapping of the AMI.
     * @var string
     */
    public $noDevice;
}