<?php

class Scalr_Util_DateTime
{
	public static function convertDateTime(DateTime $dt, $remoteTz = NULL)
	{
		if (is_null($remoteTz)) {
			$remoteTz = date_default_timezone_get();
			if (! is_string($remoteTz))
				return $dt;
		}

		if (! $remoteTz instanceof DateTimeZone)
			$remoteTz = new DateTimeZone($remoteTz);

		$dt->setTimezone($remoteTz);
		return $dt;
	}

	/**
	 * Converts Time according to timezone settings of current user.
	 *
	 * @param   DateTime|string|int  $value  DateTime object or Unix Timestamp or string that represents time.
	 * @param   string               $format  Format
	 * @return  string               Returns updated time in given format.
	 */
	public static function convertTz($value, $format = 'M j, Y H:i:s')
	{
		if (is_integer($value)) {
			$value = "@{$value}";
		}

		if ($value instanceof DateTime) {
			$dt = $value;
		} else {
			$dt = new DateTime($value);
		}

		if ($dt && $dt->getTimestamp()) {
			if (Scalr_UI_Request::getInstance()->getUser()) {
				$timezone = Scalr_UI_Request::getInstance()->getUser()->getSetting(Scalr_Account_User::SETTING_UI_TIMEZONE);
				if (! $timezone) {
					$timezone = 'UTC';
				}

				self::convertDateTime($dt, $timezone);
			}

			return $dt->format($format);
		} else
			return NULL;
	}

	public static function getTimezones()
	{
		$timezones = array();
		foreach (DateTimeZone::listAbbreviations() as $timezoneAbbreviations) {
			foreach ($timezoneAbbreviations as $value) {
				if (preg_match( '/^(America|Arctic|Asia|Atlantic|Europe|Indian|Pacific|Australia|UTC)/', $value['timezone_id']))
					$timezones[$value['timezone_id']] = $value['offset'];
			}
		}

		@ksort($timezones);
		return array_keys($timezones);
	}

	public static function findTimezoneByOffset($offset)
	{
		foreach (DateTimeZone::listAbbreviations() as $timezoneAbbreviations) {
			foreach ($timezoneAbbreviations as $value) {
				if (preg_match('/^(America|Antartica|Arctic|Asia|Atlantic|Europe|Indian|Pacific|Australia|UTC)/', $value['timezone_id']) && $value['offset'] == $offset)
					return $value['timezone_id'];
			}
		}
	}
	
	public static function getFuzzyTimeString($value)
	{
		if (is_integer($value)) {
			$value = "@{$value}";
		}

		if (!($value instanceof DateTime)) {
			$value = new DateTime($value);
		}
		$time = $value->getTimestamp();
		
		if ($time) {
			$now = time();
	        $sodTime = mktime(0, 0, 0, date('m', $time), date('d', $time), date('Y', $time));
	        $sodNow  = mktime(0, 0, 0, date('m', $now), date('d', $now), date('Y', $now));
	        
			$diff = $sodNow - $sodTime;
	        if ($sodNow == $sodTime) {// check 'today'
	            return 'today at ' . Scalr_Util_DateTime::convertTz($time, 'g:ia'); 
	        } else if ($diff <= 86400) {// check 'yesterday'
	            return 'yesterday at ' . Scalr_Util_DateTime::convertTz($time, 'g:ia'); 
	        } else if ($diff <= 604800) { //within last week
	            return floor($diff/86400).' days ago'; 
	        } else if ($diff <= 2419200) {//within last month
				$week = floor($diff/604800);
	            return $week.' week'.($week>1?'s':'').' ago';
	        } else if (date('Y', $now) == date('Y', $time)) {
	            return Scalr_Util_DateTime::convertTz($time, 'M j \a\\t g:ia'); // miss off the year if it's this year
	        } else {
	            return Scalr_Util_DateTime::convertTz($time, 'M j, Y'); // return the date as normal
	        }
			
		} else
			return NULL;
	}
}
