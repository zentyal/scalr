<?
	require_once (dirname(__FILE__)."/../../src/prepend.inc.php");

	Core::load("XMLNavigation", dirname(__FILE__)); // @TODO: delete xml menu, replace with new one
	define("NOW", str_replace("..","", substr(basename($_SERVER['PHP_SELF']),0, -4))); // @TODO: remove with old templates

    define("CHARGIFY_SITE_SHARED_KEY", "jHw77cfhB3ZJiVpTdHoxt");
?>
