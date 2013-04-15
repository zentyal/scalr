<?php

namespace Scalr\Service\Aws\Ec2\DataType;

use Scalr\Service\Aws\Ec2Exception;
use Scalr\Service\Aws\Ec2\AbstractEc2DataType;
use \DateTime;

/**
 * EbsBlockDeviceData
 *
 * @author   Vitaliy Demidov   <vitaliy@scalr.com>
 * @since    17.01.2013
 */
class EbsBlockDeviceData extends AbstractEc2DataType
{

    /**
     * The ID of the snapshot.
     * @var string
     */
    public $snapshotId;

    /**
     * The size of the volume, in GiB
     *
     * Valid values: If the volume type is io1, the minimum size of the volume is 10 GiB.
     * Default: If you're creating the volume from a snapshot and don't
     * specify a volume size, the default is the snapshot size.
     *
     * Condition: If you're specifying a block device mapping, the volume
     * size is required unless you're creating the volume from a snapshot.
     *
     * @var int
     */
    public $volumeSize;

    /**
     * Whether the Amazon EBS volume is deleted on instance termination
     * @var bool
     */
    public $deleteOnTermination;

    /**
     * The volume type.
     * Valid values: standard | io1
     * @var string
     */
    public $volumeType;

    /**
     * The number of I/O operations per second (IOPS) that the volume supports.
     * Valid values: Range is 100 to 2000.
     * Condition: Required when the volume type is io1; not used with standard volumes.
     *
     * @var int
     */
    public $iops;
}