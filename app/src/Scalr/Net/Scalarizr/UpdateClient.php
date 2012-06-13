<?php
	class Scalr_Net_Scalarizr_UpdateClient
	{
		private $dbServer,
			$port,
			$cryptoTool;
		
		
		public function __construct(DBServer $dbServer, $port = 8008) {
			$this->dbServer = $dbServer;
			$this->port = $port;
			
			$this->cryptoTool = Scalr_Messaging_CryptoTool::getInstance();
		}
		
		public function configure($repo, $schedule)
		{
			$params = new stdClass();
			$params->schedule = $schedule;
			$params->repository = $repo;
			
			return $this->request("configure", $params)->result;
		}
		
		public function getStatus()
		{
			return $this->request("status", new stdClass())->result;
		}
		
		public function updateScalarizr($force = false)
		{
			$r = new stdClass();
			$r->force = $force;
			return $this->request("update", $r);
		}
		
		public function restartScalarizr($force = false)
		{
			$r = new stdClass();
			$r->force = $force;
			return $this->request("restart", $r);
		}
		
		private function request($method, Object $params = null)
		{
			$requestObj = new stdClass();
			$requestObj->id = microtime(true);
			$requestObj->method = $method;
			$requestObj->params = $params;
			
			$jsonRequest = json_encode($requestObj);
			
			$timestamp = date("D d M Y H:i:s T");
			$dt = new DateTime($timestamp, new DateTimeZone("CDT"));
			$timestamp = Scalr_Util_DateTime::convertDateTime($dt, new DateTimeZone("UTC"), new DateTimeZone("CDT"))->format("D d M Y H:i:s");
			$timestamp .= " UTC";
			
			$canonical_string = $jsonRequest . $timestamp;
			$signature = base64_encode(hash_hmac('SHA1', $canonical_string, $this->dbServer->GetProperty(SERVER_PROPERTIES::SZR_KEY), 1));
			
			$request = new HttpRequest("http://{$this->dbServer->remoteIp}:{$this->port}/", HTTP_METH_POST);
		  	$request->setOptions(array(
		  		'timeout'	=> 5,
		  		'connecttimeout' => 5
		  	));
		  	
		  	$request->setHeaders(array(
				"Date" =>  $timestamp, 
				"X-Signature" => $signature,
		  		"X-Server-Id" => $this->dbServer->serverId
		  	));
			$request->setRawPostData($jsonRequest);
			
			try {
				// Send request
				$request->send();
				
				if ($request->getResponseCode() == 200) {
					
					$response = $request->getResponseData();
					$jResponse = @json_decode($response['body']);
					
					if ($jResponse->error)
						throw new Exception("{$jResponse->error->message} ({$jResponse->error->code}): {$jResponse->error->data}");
						
					return $jResponse;
				} else {
					throw new Exception(sprintf("Unable to perform request to update client: %s", $request->getResponseCode()));	
				}
			} catch(HttpException $e) {
				if (isset($e->innerException))
					$msg = $e->innerException->getMessage();
			    else
					$msg = $e->getMessage();
				
				throw new Exception(sprintf("Unable to perform request to update client: %s", $msg));
			}
		}
	}