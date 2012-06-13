<?php
//require_once(SRCPATH . '/externals/recaptcha-php-1.11/recaptchalib.php');

class Scalr_UI_Controller_Guest extends Scalr_UI_Controller
{	
	public function logoutAction()
	{
		Scalr_Session::destroy();
		$this->response->setRedirect('/');
	}

	public function hasAccess()
	{
		return true;
	}
	
	public function xInitAction()
	{
		$initParams = array();
		
		if ($this->user) {
			require_once (dirname(__FILE__) . "/../../../class.XmlMenu.php");
			$Menu = new XmlMenu();
			
			if ($this->user->getType() == Scalr_Account_User::TYPE_SCALR_ADMIN) {
    			$Menu->LoadFromFile(dirname(__FILE__)."/../../../../etc/admin_nav.xml");
			} else {
				$Menu->LoadFromFile(dirname(__FILE__)."/../../../../etc/client_nav4.xml");

				// get XML document to add new children as farms names
		    	$clientMenu = $Menu->GetXml();
		
				foreach ($this->db->GetAll("SELECT name, id  FROM farms WHERE env_id=? ORDER BY `name` ASC",
					array($this->getEnvironmentId())) as $row)
				{
				    $farm_info[] = array(
				    	'name' =>$row['name'],
				    	'id' => $row['id']
				    );
				}				
				
				// creates a list of farms for server farms in main menu
				$nodeServerFarms = $clientMenu->xpath("//node[@id='server_farms']");
		
				if(count($farm_info) > 0)
					$nodeServerFarms[0]->addChild('separator');
		
				foreach($farm_info as $farm_row) {
					$farmList = $nodeServerFarms[0]->addChild('node');
					$farmList->addAttribute('title', $farm_row['name']);
		
					$itemFarm = $farmList->addChild('item','Manage');
						$itemFarm->addAttribute('href', "#/farms/{$farm_row['id']}/view");
					$itemFarm = $farmList->addChild('item','Edit');
						$itemFarm->addAttribute('href', "#/farms/{$farm_row['id']}/edit");
					$itemFarm = $farmList->addChild('separator');
					$itemFarm = $farmList->addChild('item',"Roles");
						$itemFarm->addAttribute('href', "#/farms/{$farm_row['id']}/roles");
					$itemFarm = $farmList->addChild('item',"Servers");
						$itemFarm->addAttribute('href', "#/farms/{$farm_row['id']}/servers");
					$itemFarm = $farmList->addChild('item', "DNS zones");
						$itemFarm->addAttribute('href', "#/farms/{$farm_row['id']}/dnszones");
		
					$itemFarm = $farmList->addChild('item',"Apache vhosts");
					$itemFarm->addAttribute('href', "#/farms/{$farm_row['id']}/vhosts");
			    }
		    }
		    
		    if ($this->user->getAccountId() != 0) {
			    if (!$this->environment->isPlatformEnabled(SERVER_PLATFORMS::EC2)) {
			    	$t = &$clientMenu->xpath("//node[@id='tools_aws']");
			    	$t[0]->addAttribute("hidden", "1");
			    	$f1 = true;
			    }
			    
			    if (!$this->environment->isPlatformEnabled(SERVER_PLATFORMS::CLOUDSTACK)) {
			    	$t = $clientMenu->xpath("//node[@id='tools_cloudstack']");
			    	$t[0]->addAttribute("hidden", "1");
			    	$f2 = true;
			    }
			    
			    if (!$this->environment->isPlatformEnabled(SERVER_PLATFORMS::RACKSPACE)) {
			    	$t = $clientMenu->xpath("//node[@id='tools_rackspace']");
			    	$t[0]->addAttribute("hidden", "1");
			    	$f2 = true;
			    }
			   
			    if ($f1 && $f2) {
			   		$t = &$clientMenu->xpath("//separator[@id='tools_sep']");
			   		$t[0]->addAttribute("hidden", "1");
			    }
		    }
		    
		    $initParams['menu'] = $Menu->GetExtJSMenuItems();
			
			$initParams['user'] = array(
				'userId' => $this->user->getId(),
				'clientId' => $this->user->getAccountId(),
				'userName' => $this->user->getEmail(),
				'envId' => $this->getEnvironment() ? $this->getEnvironmentId() : 0,
				'type' => $this->user->getType()
			);

			if ($this->user->getAccountId() != 0) {
				$initParams['flags'] = $this->user->getAccount()->getFeaturesList();
				$initParams['user']['userIsTrial'] = $this->user->getAccount()->getSetting(Scalr_Account::SETTING_IS_TRIAL) == '1' ? true : false;
			} else {
				$initParams['flags'] = array();
			}
			
			$initParams['flags']['dashboardEnabled'] = $this->user->getSetting(Scalr_Account_User::SETTING_DASHBOARD_ENABLED) == '1' ? true : false;

			if ($this->user->getType() == Scalr_Account_User::TYPE_ACCOUNT_OWNER) {
				$initParams['user']['userIsOldPkg'] = $this->user->getAccount()->getSetting(Scalr_Account::SETTING_BILLING_ALERT_OLD_PKG) == '1' ? true : false;
				$initParams['user']['userIsPaypal'] = $this->user->getAccount()->getSetting(Scalr_Account::SETTING_BILLING_ALERT_PAYPAL) == '1' ? true : false;

				if (! $this->user->getAccount()->getSetting(Scalr_Account::SETTING_DATE_ENV_CONFIGURED)) {
					if (count($this->environment->getEnabledPlatforms()) == 0)					
						$initParams['flags']['needEnvConfig'] = Scalr_Environment::init()->loadDefault($this->user->getAccountId())->id;
				}
			}
		}

		$initParams['extjs'] = array(
			$this->getModuleName("init.js"),
			$this->getModuleName("theme.js"),
			$this->getModuleName("override.js"),
			$this->getModuleName("utils.js"),
			$this->getModuleName("ui-plugins.js"),
			$this->getModuleName("ui.js"),
			$this->getModuleName("highlightjs/highlight.pack.js")
		);

		$initParams['css'] = array(
			$this->getModuleName("theme.css"),
			$this->getModuleName("ui.css"),
			$this->getModuleName("utils.css"),
			$this->getModuleName("highlightjs/styles/solarized_light.css")
		);

		if ($this->user) {
			$initParams['menu'][] = '->';

			if ($initParams['user']['userIsTrial']) {
				$initParams['menu'][] = array(
					'text' => 'Live Chat',
					'itemId' => 'trialChat',
					'iconCls' => 'scalr-menu-icon-supportchat'
				);
			}

			$t1 = array('text' => $initParams['user']['userName'], 'iconCls' => 'scalr-menu-icon-login', 'menu' => array(
				array('href' => '#/core/api', 'text' => 'API access', 'iconCls' => 'scalr-menu-icon-api'),
				array('xtype' => 'menuseparator'),
				array('href' => '#/core/profile', 'text' => 'Profile', 'iconCls' => 'scalr-menu-icon-profile'),
				array('href' => '#/core/settings', 'text' => 'Settings', 'iconCls' => 'scalr-menu-icon-settings')
			));

			$t1['menu'][] = array('xtype' => 'menuseparator');
			$t1['menu'][] = array('href' => '/guest/logout', 'text' => 'Logout', 'iconCls' => 'scalr-menu-icon-logout');

			$initParams['menu'][] = $t1;
			
			if ($this->getEnvironment()) {
				$envs = array();
				foreach($this->user->getEnvironments() as $env) {
					$envs[] = array(
						'text' => $env['name'],
						'checked' => $env['id'] == $this->getEnvironmentId(),
						'group' => 'environment',
						'envId' => $env['id']
					);
				}

				if ($this->user->getType() == Scalr_Account_User::TYPE_ACCOUNT_OWNER || $this->user->isTeamOwner()) {
					$envs[] = array('xtype' => 'menuseparator');
					$envs[] = array('href' => '#/environments/view', 'text' => 'Manage');

					if ($this->user->getType() == Scalr_Account_User::TYPE_ACCOUNT_OWNER)
						$envs[] = array('href' => '#/environments/create', 'text' => 'Add new');
				}
				
				$initParams['menu'][] = array(
					'iconCls' => 'scalr-menu-icon-environment',
					'text' => $this->getEnvironment()->name,
					'menu' => $envs,
					'environment' => 'true',
					'tooltip' => 'Environment'
				);
				
				$initParams['farms'] = $this->db->getAll('SELECT * FROM farms WHERE env_id = ?', array($this->getEnvironmentId()));
			}
			
			$m = array();
			
			$m[] = array('href' => '#/account/teams/view', 'text' => 'Teams');
			$m[] = array('href' => '#/account/users/view', 'text' => 'Users');

			$initParams['menu'][] = array(
				'iconCls' => 'scalr-menu-icon-account',
				'tooltip' => 'Accounting',
				'menu' => $m
			);
			
			$initParams['menu'][] = array(
				'iconCls' => 'scalr-menu-icon-help',
				'tooltip' => 'Help',
				'menu' => array(
					array('href' => 'http://wiki.scalr.net', 'text' => 'Wiki'),
					array('href' => 'https://groups.google.com/group/scalr-discuss', 'text' => 'Support')
				)
			);

		}
		
		$this->response->data(array('initParams' => $initParams));
	}
	
	public function xCreateAccountAction()
	{
		global $Mailer; //FIXME:

		if (!class_exists("Scalr_Billing"))
			exit();
		
		$this->request->defineParams(array(
			'name', 'org', 'email', 'password', 'agreeTerms', 'newBilling',
			'country', 'phone', 'lastname', 'firstname', 'v', 'numServers'
		));

		$Validator = new Validator();

		if ($this->getParam('v') == 2) {
			if (!$this->getParam('firstname'))
				$err['firstname'] = _("First name required");
			
			if (!$this->getParam('lastname'))
				$err['lastname'] = _("Last name required");
				
			if (!$this->getParam('org'))
				$err['org'] = _("Organization required");
				
			$name = $this->getParam('firstname')." ".$this->getParam('lastname');
				
		} else {
			if (!$this->getParam('name'))
				$err['name'] = _("Account name required");
				
			$name = $this->getParam("name");
		}
		
		
		$password = $this->getParam('password');
		if (!$password)
			$password = $this->getCrypto()->sault(10);
			
		if (!$Validator->IsEmail($this->getParam('email')))
			$err['email'] = _("Invalid E-mail address");

		if (strlen($password) < 6)
			$err['password'] = _("Password should be longer than 6 chars");

	    // Check email
		$DBEmailCheck = $this->db->GetOne("SELECT COUNT(*) FROM account_users WHERE email=?", array($this->getParam('email')));
		if ($DBEmailCheck > 0)
			$err['email'] = _("E-mail already exists in database");
			
		if (!$this->getParam('agreeTerms'))
			$err['agreeTerms'] = _("You need to agree with terms and conditions");

		if (count($err) == 0) {
			$account = Scalr_Account::init();
			$account->name = $this->getParam("org") ? $this->getParam("org") : $name;
			$account->status = Scalr_Account::STATUS_ACTIVE;
			$account->save();

			$account->createEnvironment("default", true);

			$user = $account->createUser($this->getParam('email'), $password, Scalr_Account_User::TYPE_ACCOUNT_OWNER);
			$user->fullname = $name;
			$user->save();
			
			if ($this->getParam('v') == 2) {
				$user->setSetting('website.phone', $this->getParam('phone'));
				$user->setSetting('website.country', $this->getParam('country'));
				$user->setSetting('website.num_servers', $this->getParam('numServers'));
			}

			/**
			 * Limits
			 */
			try {
				$billing = new Scalr_Billing();
				$billing->loadByAccount($account);
				$billing->createSubscription(Scalr_Billing::PACKAGE_SEED, "", "", "", "");
				/*******************/
		    } catch (Exception $e) {
		    	$account->delete();	
		    	header("Location: https://scalr.net/order/?error={$e->getMessage()}");
		    	exit();
		    }
		
			
			
			if ($_COOKIE['__utmz']) {
				$gaParser = new Scalr_Service_GoogleAnalytics_Parser();

				$clientSettings[CLIENT_SETTINGS::GA_CAMPAIGN_CONTENT] = $gaParser->campaignContent;
				$clientSettings[CLIENT_SETTINGS::GA_CAMPAIGN_MEDIUM] = $gaParser->campaignMedium;
				$clientSettings[CLIENT_SETTINGS::GA_CAMPAIGN_NAME] = $gaParser->campaignName;
				$clientSettings[CLIENT_SETTINGS::GA_CAMPAIGN_SOURCE] = $gaParser->campaignSource;
				$clientSettings[CLIENT_SETTINGS::GA_CAMPAIGN_TERM] = $gaParser->campaignTerm;
				$clientSettings[CLIENT_SETTINGS::GA_FIRST_VISIT] = $gaParser->firstVisit;
				$clientSettings[CLIENT_SETTINGS::GA_PREVIOUS_VISIT] = $gaParser->previousVisit;
				$clientSettings[CLIENT_SETTINGS::GA_TIMES_VISITED] = $gaParser->timesVisited;
			}

			$clientSettings[CLIENT_SETTINGS::RSS_LOGIN] = $this->getParam('email');
			$clientSettings[CLIENT_SETTINGS::RSS_PASSWORD] = $this->getCrypto()->sault(10);

			foreach ($clientSettings as $k=>$v)
				$account->setSetting($k, $v);

			try {
				$this->db->Execute("INSERT INTO default_records SELECT null, '{$account->id}', rtype, ttl, rpriority, rvalue, rkey FROM default_records WHERE clientid='0'");
			}
			catch(Exception $e){}

			$clientinfo = array(
				'fullname'	=> $name,
				'firstname'	=> ($this->getParam('firstname')) ? $this->getParam('firstname') : $name,
				'email'		=> $this->getParam('email'),
				'password'	=> $password
			);

			
			$mailer = new PHPMailer();
			$mailer->Subject = 'Welcome to the Scalr revolution!';
			$mailer->From = 'yoda@scalr.com';
			$mailer->FromName = 'Scalr';
			$mailer->AddAddress($this->getParam('email'));
			$mailer->IsHTML(true);
			$mailer->Body = @file_get_contents(dirname(__FILE__).'/../../../../templates/en_US/emails/welcome.html');
			$mailer->Body = str_replace(array('{{FirstName}}','{{Password}}'), array($clientinfo['firstname'], $clientinfo['password']), $mailer->Body);
			
			$mailer->Send();
			
			/*
			// Send welcome E-mail
			$Mailer->ClearAddresses();
			$Mailer->From 		='yoda@scalr.com';
			$res = $Mailer->Send("emails/welcome.eml",
				array("client" => $clientinfo, "site_url" => "http://{$_SERVER['HTTP_HOST']}"),
				$this->getParam('email'),
				''
			);
			*/
			
			$user->getAccount()->setSetting(Scalr_Account::SETTING_IS_TRIAL, 1);
			
			//AutoLogin
			$user->updateLastLogin();
			Scalr_Session::create($user->getId());
			Scalr_Session::keepSession();
			
			header("Location: http://scalr.net/thanks.html");
		}
		else {
			$errors = array_values($err);
			$error = $errors[0]; 
			header("Location: https://scalr.net/order/?error={$error}");
			//$this->response->failure();
			//$this->response->data(array('errors' => $err));
		}
		exit();
	}


	public function loginAction()
	{
		$this->response->page('ui/guest/login.js', array('loginAttempts'=>0));
	}

	private function loginUserGet()
	{
		$this->request->defineParams(array(
			'scalrLogin', 'scalrPass'
		));

		if ($this->getParam('scalrLogin') != '' && $this->getParam('scalrPass') != '') {
			$user = Scalr_Account_User::init()->loadByEmail($this->getParam('scalrLogin'));
			if (!$user)
				throw new Exception("Incorrect login or password");

			if ($user->getSetting(Scalr_Account_User::SETTING_SECURITY_IP_WHITELIST)) {
				$ips = explode(',', $user->getSetting(Scalr_Account_User::SETTING_SECURITY_IP_WHITELIST));
				$inList = false;
				foreach ($ips as $ip) {
					if(preg_match('/'.$ip.'/', $_SERVER['REMOTE_ADDR']))
						$inList = true;
				}
				if (!$inList)
					throw new Exception('Forbidden IP');
			}

			$pass = $user->checkPassword($this->getParam('scalrPass'));
			if ($pass)
				return $user;
			else
				throw new Exception('Incorrect login or password');
		} else
			throw new Exception('Incorrect login or password');
	}

	private function loginUserCreate($user)
	{
		$user->updateLastLogin();

		Scalr_Session::create($user->getId());

		if ($this->getParam('scalrKeepSession') == 'on')
			Scalr_Session::keepSession();

		$this->response->data(array('userId' => $user->getId()));
	}

	public function xLoginAction()
	{
		$loginattempt = $this->db->GetRow("SELECT loginattempts FROM account_users WHERE `email` = ?",
			array($this->getParam('scalrLogin'))
		);
		if($loginattempt['loginattempts'] > 2) {
			$text = file_get_contents('http://www.google.com/recaptcha/api/challenge?k=6Le9Us4SAAAAAOlqx9rkyJq0g3UBZtpoETmqUsmY');
			$start = strpos($text, "challenge : '")+13;
			$length = strpos($text, ",", $start)-$start;
			$curl = curl_init();
			// TODO: move private key to config.ini
			curl_setopt($curl, CURLOPT_URL, 'http://www.google.com/recaptcha/api/verify?privatekey=6Le9Us4SAAAAAHcdRP6Dx44BIwVU0MOOGhBuOxf6&remoteip=my.scalr.net&challenge='.substr($text, $start, $length).'&response='.$this->getParam('kCaptcha'));
			curl_setopt($curl, CURLOPT_TIMEOUT, 10);
			curl_setopt($curl, CURLOPT_FOLLOWLOCATION, true);
			curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);

			$response = curl_exec($curl);
			curl_close($curl);
			if(preg_match('/false?.*/',$response )) {
				$this->response->data($loginattempt);
				throw new Exception('Incorrect captcha');
			}
		}
		try {
			$user = $this->loginUserGet();

			// check for 2-factor auth
			if ($user) {
				if (
					($user->getAccountId() && $user->getAccount()->isFeatureEnabled(Scalr_Limits::FEATURE_2FA) || !$user->getAccountId()) &&
					($user->getSetting(Scalr_Account_User::SETTING_SECURITY_2FA_GGL) == 1)
				) {
					$this->response->data(array(
						'tfa' => '#/guest/loginTfaGgl'
					));
					return;
				}
			} else
				throw new Exception('Incorrect login or password');

			$this->loginUserCreate($user);
		} catch (Exception $e) {
			$loginattempt = $this->db->GetRow("SELECT loginattempts FROM account_users WHERE `email` = ?",
				array($this->getParam('scalrLogin'))
			);
			$this->response->data($loginattempt);
			$this->response->failure('Incorrect login or password');
		}
	}

	public function loginTfaGglAction()
	{
		$user = $this->loginUserGet();

		$this->response->page('ui/guest/loginTfaGgl.js', array(
			'valid' => (
				($user->getAccountId() && $user->getAccount()->isFeatureEnabled(Scalr_Limits::FEATURE_2FA) || !$user->getAccountId()) &&
				($user->getSetting(Scalr_Account_User::SETTING_SECURITY_2FA_GGL) == 1)
			),
			'authenticated' => is_object($this->user)
		));
	}

	public function xLoginTfaGglAction()
	{
		$user = $this->loginUserGet();

		if (
			($user->getAccountId() && $user->getAccount()->isFeatureEnabled(Scalr_Limits::FEATURE_2FA) || !$user->getAccountId()) &&
			($user->getSetting(Scalr_Account_User::SETTING_SECURITY_2FA_GGL) == 1)
		) {
			$key = $this->getCrypto()->decrypt($user->getSetting(Scalr_Account_User::SETTING_SECURITY_2FA_GGL_KEY), $this->cryptoKey);

			if ($this->getParam('tfaCode') && Scalr_Util_Google2FA::verifyKey($key, $this->getParam('tfaCode'))) {
				$this->loginUserCreate($user);
			} else {
				$this->response->failure('Invalid code');
			}
		} else {
			$this->response->failure('Two-factor authentication not enabled for this user');
		}
	}

	public function recoverPasswordAction()
	{
		$this->response->page('ui/guest/recoverPassword.js');
	}

	public function xResetPasswordAction()
	{
		global $Mailer; //FIXME:

		$user = Scalr_Account_User::init()->loadByEmail($this->getParam('email'));

		if ($user) {
			$hash = $this->getCrypto()->sault(10);

			$user->setSetting(Scalr_Account::SETTING_OWNER_PWD_RESET_HASH, $hash);

			$clientinfo = array(
				'email' => $user->getEmail(),
				'fullname'	=> $user->fullname
			);

			// Send welcome E-mail
			$Mailer->ClearAddresses();
			$res = $Mailer->Send("emails/password_change_confirm.eml",
				array("client" => $clientinfo, "pwd_link" => "https://{$_SERVER['HTTP_HOST']}/#/guest/updatePassword/?hash={$hash}"),
				$clientinfo['email'],
				$clientinfo['fullname']
			);

			$this->response->success("Confirmation email has been sent to you");
		}
		else
			$this->response->failure("Specified e-mail not found in our database");
	}

	public function updatePasswordAction()
	{
		$user = Scalr_Account_User::init()->loadBySetting(Scalr_Account::SETTING_OWNER_PWD_RESET_HASH, $this->getParam('hash'));
		$this->response->page('ui/guest/updatePassword.js', array('valid' => is_object($user), 'authenticated' => is_object($this->user)));
	}

	public function xUpdatePasswordAction()
	{
		$user = Scalr_Account_User::init()->loadBySetting(Scalr_Account::SETTING_OWNER_PWD_RESET_HASH, $this->getParam('hash'));

		if ($user) {
			$password = $this->getParam('password');
			$user->updatePassword($password);
			$user->save();

			$user->setSetting(Scalr_Account::SETTING_OWNER_PWD_RESET_HASH, "");

			//Scalr_Session::create($user->getAccountId(), $user->getId(), $user->getType());

			$this->response->success("Password has been reset. Please log in.");
		} else {
			$this->response->failure("Incorrect confirmation link");
		}
	}

	public function xPerpetuumMobileAction()
	{
		$result = array();

		if ($this->user) {
			if ($this->getParam('updateDashboard'))
				$result['updateDashboard'] = Scalr_UI_Controller::loadController('dashboard')->checkLifeCycle($this->getParam('updateDashboard'));
		}

		$equal = $this->user && ($this->user->getId() == $this->getParam('userId')) &&
			(($this->getEnvironment() ? $this->getEnvironmentId() : 0) == $this->getParam('envId'));

		$result['equal'] = $equal;
		$result['isAuthenticated'] = $this->user ? true : false;

		$this->response->data($result);
	}

	public function xPostErrorAction()
	{
		$this->request->defineParams(array(
			'url', 'file', 'lineno', 'message'
		));

		$this->db->Execute('INSERT INTO ui_errors (tm, file, lineno, url, short, message, browser, account_id) VALUES (NOW(), ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE cnt = cnt + 1', array(
			$this->getParam('file'),
			$this->getParam('lineno'),
			$this->getParam('url'),
			$this->getParam('message'),
			$this->getParam('message'),
			$_SERVER['HTTP_USER_AGENT'],
			$this->user ? $this->user->getAccountId() : ''
		));

		$this->response->success();
	}
}
