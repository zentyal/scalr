<?php
namespace Scalr\Service\OpenStack\Type;

/**
 * AbstractInitType
 *
 * @author   Vitaliy Demidov  <vitaliy@scalr.com>
 * @since    07.12.2012
 */
abstract class AbstractInitType
{
    /**
     * Initializes a new object of the class
     *
     * @return AbstractInitType
     */
    public static function init()
    {
        $class = get_called_class();
        $obj = new $class;
        $args = func_get_args();
        if (!empty($args)) {
            call_user_func_array(array($obj, '__construct'), $args);
        }
        return $obj;
    }
}