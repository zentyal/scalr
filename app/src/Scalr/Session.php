<?php

class Scalr_Session
{
	private
		$userId,
		$envId,
		$sault,
		$hash,
		$hashpwd,
		$restored = false;

	private static $_session = null;

	const SESSION_USER_ID ='userId';
	const SESSION_ENV_ID = 'envId';
	const SESSION_HASH = 'hash';
	const SESSION_SAULT = 'sault';

	/**
	 * @return Scalr_Session
	 */
	public static function getInstance()
	{
		if (self::$_session === null) {
			self::$_session = new Scalr_Session();
			self::$_session->hashpwd = Scalr_Util_CryptoTool::hash(@file_get_contents(dirname(__FILE__)."/../etc/.cryptokey"));
		}

		if (! self::$_session->restored) {
			self::$_session->restored = true;
			Scalr_Session::restore();
		}

		return self::$_session;
	}

	public static function create($userId)
	{
		@session_start();
		$_SESSION[__CLASS__][self::SESSION_USER_ID] = $userId;

		$sault = Scalr_Util_CryptoTool::sault();
		$_SESSION[__CLASS__][self::SESSION_SAULT] = $sault;
		$_SESSION[__CLASS__][self::SESSION_HASH] = self::createHash($userId, $sault);
		@session_write_close();

		self::restore(false);
	}

	protected static function getUserPassword($userId)
	{
		$db = Core::GetDBInstance();
		return $db->GetOne('SELECT password FROM `account_users` WHERE id = ?', array($userId));
	}

	protected static function createHash($userId, $sault)
	{
		$pass = self::getUserPassword($userId);
		return Scalr_Util_CryptoTool::hash("{$userId}:{$pass}:" . self::getInstance()->hashpwd . ":{$sault}");
	}

	protected static function createCookieHash($userId, $sault, $hash)
	{
		$pass = self::getUserPassword($userId);
		return Scalr_Util_CryptoTool::hash("{$sault}:{$hash}:{$userId}:{$pass}:".self::getInstance()->hashpwd);
	}

	protected static function restore($checkKeepSessionCookie = true)
	{
		$session = self::getInstance();
		@session_start();
		$session->userId = isset($_SESSION[__CLASS__][self::SESSION_USER_ID]) ? $_SESSION[__CLASS__][self::SESSION_USER_ID] : 0;
		$session->envId = isset($_SESSION[__CLASS__][self::SESSION_ENV_ID]) ? $_SESSION[__CLASS__][self::SESSION_ENV_ID] : 0;
		$session->sault = isset($_SESSION[__CLASS__][self::SESSION_SAULT]) ? $_SESSION[__CLASS__][self::SESSION_SAULT] : '';
		$session->hash = isset($_SESSION[__CLASS__][self::SESSION_HASH]) ? $_SESSION[__CLASS__][self::SESSION_HASH] : '';

		$newhash = self::createHash($session->userId, $session->sault);
		if (! ($newhash == $session->hash && !empty($session->hash))) {
			// reset session (invalid)
			$session->userId = 0;
			$session->hash = '';

			if ($checkKeepSessionCookie && self::isCookieKeepSession())
				self::restore(false);
		}

		@session_write_close();
	}

	public static function isCookieKeepSession()
	{
		// check for session restore
		if (isset($_COOKIE['scalr_user_id']) &&
			isset($_COOKIE['scalr_sault']) &&
			isset($_COOKIE['scalr_hash']) &&
			isset($_COOKIE['scalr_signature'])
		) {
			$signature = self::createCookieHash($_COOKIE['scalr_user_id'], $_COOKIE['scalr_sault'], $_COOKIE['scalr_hash']);
			$hash = self::createHash($_COOKIE['scalr_user_id'], $_COOKIE['scalr_sault']);

			if ($signature == $_COOKIE['scalr_signature'] && $hash == $_COOKIE['scalr_hash']) {
				$_SESSION[__CLASS__][self::SESSION_USER_ID] = $_COOKIE['scalr_user_id'];
				$_SESSION[__CLASS__][self::SESSION_SAULT] = $_COOKIE['scalr_sault'];
				$_SESSION[__CLASS__][self::SESSION_HASH] = $_COOKIE['scalr_hash'];

				return true;
			}
		}

		return false;
	}

	public static function destroy()
	{
		@session_start();
		@session_destroy();

		@setcookie("tender_email", "0", time()-86400, "/");
		@setcookie("tender_expires", "0", time()-86400, "/");
		@setcookie("tender_hash", "0", time()-86400, "/");
		@setcookie("tender_name", "0", time()-86400, "/");
		@setcookie("_tender_session", "0", time()-86400, "/");
		@setcookie("anon_token", "0", time()-86400, "/");

		$clearKeepSession = true;

		if (isset($_COOKIE['scalr_user_id']) &&
			isset($_COOKIE['scalr_sault']) &&
			isset($_COOKIE['scalr_hash']) &&
			isset($_COOKIE['scalr_signature'])
		) {
			$signature = self::createCookieHash($_COOKIE['scalr_user_id'], $_COOKIE['scalr_sault'], $_COOKIE['scalr_hash']);
			$hash = self::createHash($_COOKIE['scalr_user_id'], $_COOKIE['scalr_sault']);

			if ($signature == $_COOKIE['scalr_signature'] && $hash == $_COOKIE['scalr_hash'] && self::getInstance()->getUserId() != $_COOKIE['scalr_user_id']) {
				$clearKeepSession = false;
			}
		}

		if ($clearKeepSession) {
			@setcookie("scalr_user_id", "0", time() - 86400, "/", null, false, true);
			@setcookie("scalr_hash", "0", time() - 86400, "/", null, false, true);
			@setcookie("scalr_sault", "0", time() - 86400, "/", null, false, true);
			@setcookie("scalr_signature", "0", time() - 86400, "/", null, false, true);
		}

		@session_write_close();
	}

	public static function keepSession()
	{
		$session = self::getInstance();
		$db = Core::GetDBInstance();

		$tm = time() + 86400 * 30;

		setcookie('scalr_user_id', $session->userId, $tm, "/", null, false, true);
		setcookie('scalr_sault', $session->sault, $tm, "/", null, false, true);
		setcookie('scalr_hash', $session->hash, $tm, "/", null, false, true);
		setcookie("scalr_signature", self::createCookieHash($session->userId, $session->sault, $session->hash), $tm, "/");
	}

	public function getUserId()
	{
		return $this->userId;
	}

	public function isAuthenticated()
	{
		return $this->userId ? true : false;
	}

	public function setEnvironmentId($envId)
	{
		@session_start();
		$_SESSION[__CLASS__][self::SESSION_ENV_ID] = $this->envId = $envId;
		@session_write_close();
	}

	public function getEnvironmentId()
	{
		return $this->envId;
	}
}
