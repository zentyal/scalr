<?php
	class Scalr_Net_Scalarizr_UpdateClient
	{
		private $dbServer,
			$port,
			$timeout,
			$cryptoTool;
		
		
		public function __construct(DBServer $dbServer, $port = 8008, $timeout = 5) {
			$this->dbServer = $dbServer;
			$this->port = $port;
            $this->timeout = $timeout;
			
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
        
        public function executeCmd($cmd) {
            $r = new stdClass();
            $r->command = $cmd;
            return $this->request("execute", $r);
        }
        
        public function putFile($path, $contents)
        {
            $r = new stdClass();
            $r->name = $path;
            $r->content = base64_encode($contents);
            $r->makedirs = true;
            return $this->request("put_file", $r);
        }
		
		private function request($method, Object $params = null)
		{
			$requestObj = new stdClass();
			$requestObj->id = microtime(true);
			$requestObj->method = $method;
			$requestObj->params = $params;
			
			$jsonRequest = json_encode($requestObj);

			$dt = new DateTime('now', new DateTimeZone("UTC"));
			$timestamp = $dt->format("D d M Y H:i:s e");

			$canonical_string = $jsonRequest . $timestamp;
			$signature = base64_encode(hash_hmac('SHA1', $canonical_string, $this->dbServer->GetProperty(SERVER_PROPERTIES::SZR_KEY), 1));
			
			$request = new HttpRequest("http://{$this->dbServer->remoteIp}:{$this->port}/", HTTP_METH_POST);
		  	$request->setOptions(array(
		  		'timeout'	=> $this->timeout,
		  		'connecttimeout' => $this->timeout
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
						throw new Exception("{$jResponse->error->message} ({$jResponse->error->code}): {$jResponse->error->data} ({$response['body']})");
						
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