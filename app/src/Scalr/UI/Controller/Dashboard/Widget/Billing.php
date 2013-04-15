<?php
class Scalr_UI_Controller_Dashboard_Widget_Billing extends Scalr_UI_Controller_Dashboard_Widget
{
	public function getDefinition()
	{
		return array(
			'type' => 'nonlocal'
		);
	}

	public function getContent($params = array())
	{
		return array();
	}
	public function xGetContentAction()
	{
		$this->response->data($this->getContent());
	}
}