<?php
class Scalr_UI_Controller_Dashboard_Widget_Usagelaststat extends Scalr_UI_Controller_Dashboard_Widget
{
	public function getDefinition()
	{
		return array(
			'type' => 'local'
		);
	}

	public function getContent($params = array())
	{
		if (!$params['farmCount'])
			$params['farmCount'] = 10;
		$price = self::loadController('Statistics')->getInstancePrice();
		$stat = array();
		$farms = self::loadController('Farms')->getList();
		$currentTime = getdate();
		$years = array($currentTime['year']);
		$months = array();
		$months['current'] = $currentTime['mon'];
		if($currentTime['mon'] == 1) {
			$years[1] = $currentTime['year']-1;
			$months['recent'] = 12;
		} else
			$months['recent'] = $currentTime['mon']-1;
		$sql = 'SELECT `usage`, `month`, `farm_id`, `instance_type`, `cloud_location` FROM `servers_stats` WHERE `env_id` = ? AND `year` IN (?) AND `month` IN (?)';
		if ($params['farmCount'] != 'all')
			$sql .= ' LIMIT 0, ?';
		$usages = $this->db->Execute($sql, array($this->getEnvironmentId(), implode(', ', $years), implode(', ', $months), (int)$params['farmCount']));
        $total = array(
			'recent' =>0,
			'current' =>0
		);
		while ($value = $usages->FetchRow()) {
			$month = 'current';
			if ($value['month'] == $months['recent'])
				$month = 'recent';
			if (!$stat['farms'][$value['farm_id']]) {
				$stat['farms'][$value['farm_id']]['farm_id'] = $value['farm_id'];
				$stat['farms'][$value['farm_id']]['farm'] = $farms[$value['farm_id']]['name'];
				if (!$farms[$value['farm_id']]['name'])
					$stat['farms'][$value['farm_id']]['farm'] = '* removed farm *';
				$stat['farms'][$value['farm_id']][$month] = 0;
			}
			$stat['farms'][$value['farm_id']][$month] += round($price[$value['cloud_location']][$value['instance_type']] * round(($value['usage'] / 60), 2), 2);
			$total[$month] += round($price[$value['cloud_location']][$value['instance_type']] * round(($value['usage'] / 60), 2), 2);
		}
		$stat['total'] = $total;
		return $stat;
	}
}