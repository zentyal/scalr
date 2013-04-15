<?php
class Scalr_Scripting_Manager
{
	private static function makeSeed()
	{
		list($usec, $sec) = explode(' ', microtime());
		return (float) $sec + ((float) $usec * 100000);
	}	
	
	public static function generateEventName($prefix)
	{
		mt_srand(self::makeSeed());
		return "{$prefix}-" . date("YmdHis") . '-' . mt_rand(100000,999999);
	}
	
	public static function extendMessage(Scalr_Messaging_Msg $message, Event $event, DBServer $eventServer, DBServer $targetServer)
	{
		$db = Core::GetDBInstance();
		
        try {
            $retval = array();
            $scripts = self::getEventScriptList($event, $eventServer, $targetServer);
            if (count($scripts) > 0) {
                foreach ($scripts as $script) {                       
                    $itm = new stdClass();
                    // Script
                    $itm->asynchronous = ($script['issync'] == 1) ? '0' : '1';
                    $itm->timeout = $script['timeout'];
                    $itm->name = $script['name'];
                    $itm->body = $script['body'];
                    
                    $retval[] = $itm;
                }
            }
        } catch (Exception $e) {}
        
		$message->scripts = $retval;
		$message->eventId = $event->GetEventID();
        $message->globalVariables = array();
        
        //Global variables
        if (count($message->scripts) > 0) {
            try {
                $globalVariables = new Scalr_Scripting_GlobalVariables($eventServer->envId);
                $vars = $globalVariables->listVariables($eventServer->roleId, $eventServer->farmId, $eventServer->farmRoleId);
                foreach ($vars as $k => $v) {
                    $message->globalVariables[] = (object)array('name' => $k, 'value' => $v);
                }
            } catch (Exception $e) {}
        }
        
		return $message;
	}
	
	public static function prepareScript($scriptSettings, DBServer $targetServer, Event $event = null)
	{
		$db = Core::GetDBInstance();
		
		//$scriptSettings['version'] = (int)$scriptSettings['version'];
		
		if ($scriptSettings['version'] == 'latest' || (int)$scriptSettings['version'] == -1) {
			$version = (int)$db->GetOne("SELECT MAX(revision) FROM script_revisions WHERE scriptid=?",
				array($scriptSettings['scriptid'])
			);
		}
		else
			$version = (int)$scriptSettings['version'];
			
		$template = $db->GetRow("SELECT name,id FROM scripts WHERE id=?", 
			array($scriptSettings['scriptid'])
		);
		$template['timeout'] = $scriptSettings['timeout'];
		$template['issync'] = $scriptSettings['issync'];
		
        $revisionInfo = $db->GetRow("SELECT script, variables FROM script_revisions WHERE scriptid=? AND revision=?", array(
            $template['id'], $version
        ));
		
		$template['body'] = $revisionInfo['script'];
		
		if (!$template['body'])
			return false;
			
        $scriptParams = (array)unserialize($revisionInfo['variables']);
        foreach ($scriptParams as &$val)
            $val = "";
        
		$params = array_merge($scriptParams, $targetServer->GetScriptingVars(), (array)unserialize($scriptSettings['params']));

		if ($event) {
			$eventServer = $event->DBServer;
			foreach ($eventServer->GetScriptingVars() as $k => $v) {
				$params["event_{$k}"] = $v;
			}
			
			foreach ($event->GetScriptingVars() as $k=>$v)
				$params[$k] = $event->{$v};
			
			$params['event_name'] = $event->GetName();
		} 
		
		if ($event instanceof CustomEvent) {
			if (count($event->params) > 0)
				$params = array_merge($params, $event->params);
		}
		
		// Prepare keys array and array with values for replacement in script
		$keys = array_keys($params);
		$f = create_function('$item', 'return "%".$item."%";');
		$keys = array_map($f, $keys);
		$values = array_values($params);
		$script_contents = str_replace($keys, $values, $template['body']);
        $template['body'] = str_replace('\%', "%", $script_contents);
        
        // Parse and set variables from data bag
        //TODO: @param_name@
        
		// Generate script contents
		$template['name'] = preg_replace("/[^A-Za-z0-9]+/", "_", $template['name']);
		
		return $template;
	}
	
	public static function getEventScriptList(Event $event, DBServer $eventServer, DBServer $targetServer) 
	{
		$db = Core::GetDBInstance();
		
		$roleScripts = $db->GetAll("SELECT * FROM role_scripts WHERE (event_name=? OR event_name='*') AND role_id=? ORDER BY order_index ASC", array($event->GetName(), $eventServer->roleId));
		
		$scripts = $db->GetAll("SELECT * FROM farm_role_scripts WHERE (event_name=? OR event_name='*') AND farmid=? ORDER BY order_index ASC", array($event->GetName(), $eventServer->farmId));
		
		foreach ($roleScripts as $script) {
			
			$params = $db->GetOne("SELECT params FROM farm_role_scripting_params WHERE farm_role_id = ? AND `hash` = ? AND farm_role_script_id = '0'", array(
				$eventServer->farmRoleId,
				$script['hash']
			));
			if ($params)
				$script['params'] = $params;
			
			$scripts[] = array(
			 "id" => "r{$script['id']}",
			 "scriptid" => $script['script_id'], 
			 "params" => $script['params'],
			 "event_name" => $event->GetName(), 
			 "target" => $script['target'], 
			 "version" => $script['version'], 
			 "timeout" => $script['timeout'], 
			 "issync" => $script['issync'],
			 "order_index" => $script['order_index'],
			 "type"   => "role" 
			);
		}

		$retval = array();
		foreach ($scripts as $scriptSettings) {
			$scriptSettings['order_index'] = (float)$scriptSettings['order_index'];
			
			// If target set to that instance only
			if ($scriptSettings['target'] == SCRIPTING_TARGET::INSTANCE && $eventServer->serverId != $targetServer->serverId)
				continue;
				
			// If target set to all instances in specific role
			if ($scriptSettings['target'] == SCRIPTING_TARGET::ROLE && $eventServer->farmRoleId != $targetServer->farmRoleId)
				continue;

			if ($scriptSettings['type'] != 'role') {
				// Validate that event was triggered on the same farmRoleId as script
				if ($eventServer->farmRoleId != $scriptSettings['farm_roleid'])
					continue;
				
				// Validate that target server has the same farmRoleId as event server with target ROLE
				if ($scriptSettings['type'] != 'role' && $scriptSettings['target'] == SCRIPTING_TARGET::ROLE && $targetServer->farmRoleId != $scriptSettings['farm_roleid'])
					continue;
			}
			
			if ($scriptSettings['target'] == SCRIPTING_TARGET::ROLES || $scriptSettings['target'] == SCRIPTING_TARGET::BEHAVIORS) {
				
				if ($scriptSettings['type'] != 'role')
					$targets = $db->GetAll("SELECT * FROM farm_role_scripting_targets WHERE farm_role_script_id = ?", array($scriptSettings['id']));
				else 
					$targets = array();
				
				$execute = false;
				foreach ($targets as $target) {
					switch ($target['target_type']) {
						case "farmrole":
							if ($targetServer->farmRoleId == $target['target'])
								$execute = true;
							break;
						case "behavior":
							if ($targetServer->GetFarmRoleObject()->GetRoleObject()->hasBehavior($target['target']))
								$execute = true;
							break;
					}
				}
				
				if (!$execute)
					continue;
			}
				
			if ($scriptSettings['target'] == "" || $scriptSettings['id'] == "")
				continue;
				
			$script = self::prepareScript($scriptSettings, $targetServer, $event);
			
			if ($script) {
				while (true) {
					$index = (string)$scriptSettings['order_index'];
					if (!$retval[$index]) {
						$retval[$index] = $script;
						break;
					}
					else 
						$scriptSettings['order_index'] += 0.01;	
				}
			}
		}
		
		@ksort($retval);
		
		return $retval;
	}
}