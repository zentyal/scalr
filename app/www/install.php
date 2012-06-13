<?php
session_start();
ini_set('memory_limit', '5120M');
set_time_limit ( 0 );

$step = isset( $_GET['step'] ) ? $_GET['step'] : 1;

// SQL Parser / copyright: (C) 2001 The phpBB Group
// remove_comments will strip the sql comment lines out of an uploaded sql file
// specifically for mssql and postgres type files in the install....
//
function remove_comments(&$output)
{
   $lines = explode("\n", $output);
   $output = "";

   // try to keep mem. use down
   $linecount = count($lines);

   $in_comment = false;
   for($i = 0; $i < $linecount; $i++)
   {
      if( preg_match("/^\/\*/", preg_quote($lines[$i])) )
      {
         $in_comment = true;
      }

      if( !$in_comment )
      {
         $output .= $lines[$i] . "\n";
      }

      if( preg_match("/\*\/$/", preg_quote($lines[$i])) )
      {
         $in_comment = false;
      }
   }

   unset($lines);
   return $output;
}

// SQL Parser / copyright: (C) 2001 The phpBB Group
// remove_remarks will strip the sql comment lines out of an uploaded sql file
//
function remove_remarks($sql)
{
   $lines = explode("\n", $sql);

   // try to keep mem. use down
   $sql = "";

   $linecount = count($lines);
   $output = "";

   for ($i = 0; $i < $linecount; $i++)
   {
      if (($i != ($linecount - 1)) || (strlen($lines[$i]) > 0))
      {
         if (isset($lines[$i][0]) && $lines[$i][0] != "#")
         {
            $output .= $lines[$i] . "\n";
         }
         else
         {
            $output .= "\n";
         }
         // Trading a bit of speed for lower mem. use here.
         $lines[$i] = "";
      }
   }

   return $output;

}

// SQL Parser / copyright: (C) 2001 The phpBB Group
// split_sql_file will split an uploaded sql file into single sql statements.
// Note: expects trim() to have already been run on $sql.
//
function split_sql_file($sql, $delimiter)
{
   // Split up our string into "possible" SQL statements.
   $tokens = explode($delimiter, $sql);

   // try to save mem.
   $sql = "";
   $output = array();

   // we don't actually care about the matches preg gives us.
   $matches = array();

   // this is faster than calling count($oktens) every time thru the loop.
   $token_count = count($tokens);
   for ($i = 0; $i < $token_count; $i++)
   {
      // Don't wanna add an empty string as the last thing in the array.
      if (($i != ($token_count - 1)) || (strlen($tokens[$i] > 0)))
      {
         // This is the total number of single quotes in the token.
         $total_quotes = preg_match_all("/'/", $tokens[$i], $matches);
         // Counts single quotes that are preceded by an odd number of backslashes,
         // which means they're escaped quotes.
         $escaped_quotes = preg_match_all("/(?<!\\\\)(\\\\\\\\)*\\\\'/", $tokens[$i], $matches);

         $unescaped_quotes = $total_quotes - $escaped_quotes;

         // If the number of unescaped quotes is even, then the delimiter did NOT occur inside a string literal.
         if (($unescaped_quotes % 2) == 0)
         {
            // It's a complete sql statement.
            $output[] = $tokens[$i];
            // save memory.
            $tokens[$i] = "";
         }
         else
         {
            // incomplete sql statement. keep adding tokens until we have a complete one.
            // $temp will hold what we have so far.
            $temp = $tokens[$i] . $delimiter;
            // save memory..
            $tokens[$i] = "";

            // Do we have a complete statement yet?
            $complete_stmt = false;

            for ($j = $i + 1; (!$complete_stmt && ($j < $token_count)); $j++)
            {
               // This is the total number of single quotes in the token.
               $total_quotes = preg_match_all("/'/", $tokens[$j], $matches);
               // Counts single quotes that are preceded by an odd number of backslashes,
               // which means they're escaped quotes.
               $escaped_quotes = preg_match_all("/(?<!\\\\)(\\\\\\\\)*\\\\'/", $tokens[$j], $matches);

               $unescaped_quotes = $total_quotes - $escaped_quotes;

               if (($unescaped_quotes % 2) == 1)
               {
                  // odd number of unescaped quotes. In combination with the previous incomplete
                  // statement(s), we now have a complete statement. (2 odds always make an even)
                  $output[] = $temp . $tokens[$j];

                  // save memory.
                  $tokens[$j] = "";
                  $temp = "";

                  // exit the loop.
                  $complete_stmt = true;
                  // make sure the outer loop continues at the right point.
                  $i = $j;
               }
               else
               {
                  // even number of unescaped quotes. We still don't have a complete statement.
                  // (1 odd and 1 even always make an odd)
                  $temp .= $tokens[$j] . $delimiter;
                  // save memory.
                  $tokens[$j] = "";
               }

            } // for..
         } // else
      }
   }

   return $output;
}


echo '
<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01//EN">
<html>
<head>
<title>Scalr installation</title>
<link rel="icon" type="image/vnd.microsoft.icon" href="https://scalr.net/favicon.ico" />
<style type="text/css">
    body {
        background:#F7F8F9;
        color:#333;
        font-family:Georgia;
        margin: 0;
        padding : 0;
    }
    #container{
        width:600px;
        margin-left: auto;
        margin-right: auto;
    }
    #barre{
        width:600px;
        border-bottom:solid 1px #666666; 
    }
    #logo{
        width:600px;
        height:70px;
        display:block;
        margin-top:8px;
        margin-left: auto;
        margin-right: auto;
        background-image:url("http://scalr.net/wp-content/themes/public-website/images/scalr_logo.png");
        background-repeat:no-repeat;
    }
</style>
</head>
<body>
<div id="logo"></div>
<div id="container">';

switch($step) {
    case 1: // Step 1

    echo'<div id="barre">>Step 1: Environment check</div>';

    // ********************
    // Check php extensions
    // ********************

    // Check POSIX
    if (!function_exists('posix_getpid')) 
            $err[] = "Cannot find posix_getpid function. Make sure that POSIX Functions enabled.";

    // Check PECL_HTTP
    if (!class_exists('HTTPRequest')) 
            $err[] = "Cannot find PECL_HTTP functions. Make sure that PECL_HTTP Functions enabled.";

    // Check DOM
    if (!class_exists('DOMDocument')) 
            $err[] = "Cannot find DOM functions. Make sure that DOM Functions enabled.";

    // Check SimpleXML
    if (!function_exists('simplexml_load_string')) 
            $err[] = "Cannot find simplexml_load_string function. Make sure that SimpleXML Functions enabled.";

    // Check MySQLi
    if (!function_exists('mysqli_connect')) 
            $err[] = "Cannot find mysqli_connect function. Make sure that MYSQLi Functions enabled.";

    // Check GetText
    if (!function_exists('gettext')) 
            $err[] = "Cannot find gettext function. Make sure that GetText Functions enabled.";

    // Check MCrypt
    if (!function_exists('mcrypt_encrypt')) 
            $err[] = "Cannot find mcrypt_encrypt function. Make sure that mCrypt Functions enabled.";

    // Check MHash
    if (!function_exists('hash')) 
            $err[] = "Cannot find mhash function. Make sure that HASH Functions enabled.";

    if (!function_exists('rrd_create')) 
            $err[] = "Cannot find RRD functions. Make sure that RRDTool Extension (Verison 1.2.X) installed.";

    if (!function_exists('json_encode')) 
            $err[] = "Cannot find JSON functions. Make sure that JSON Functions enabled.";

    // Check OpenSSL
    if (!function_exists('openssl_verify')) 
            $err[] = "Cannot find OpenSSL functions. Make sure that OpenSSL Functions enabled.";	

    // Check SOAP
    if (!class_exists('SoapClient')) 
            $err[] = "Cannot find SoapClient class. Make sure that SoapClient Extension enabled.";

    // Check SNMP
    if (!function_exists('snmpget')) 
            $err[] = "Cannot find SNMP functions. Make sure that SNMP Functions enabled.";

    // Check SYSVMSG
    if (!function_exists('msg_get_queue')) 
            $err[] = "Cannot find SYSVMSG functions. Make sure that sysvmsg support enabled.";

    // ********************
    // Check php settings
    // ********************

    if (ini_get('safe_mode') == 1)
            $err[] = "PHP safe mode enabled. Please disable it.";

    if (ini_get('register_gloabls') == 1)
            $err[] = "PHP register globals enabled. Please disable it.";

    if (str_replace(".", "", PHP_VERSION) < 535)
            $err[] = "PHP version must be 5.3.5 or greater.";


    // ***********************
    // Check write permissions
    // ***********************
    
    if (count($err) == 0) // If all extensions installed
    {
        // Check files & folders permissions
        $files = array(
                realpath(dirname(__FILE__)."/../etc"),
                realpath(dirname(__FILE__)."/../cache"),
                realpath(dirname(__FILE__)."/../cache/smarty_bin")
        );

        foreach ($files as $file)
        {
            if (!is_writable($file))
                $err[] = "Insuficient permissions on file {$file}. Please chmod 0777";
        }
    }
    if (count($err) == 0){
        echo '<span style="color:green">Congratulations, your environment settings match Scalr requirements!</span>
        <form id="setup" method="post" action="install.php?step=2"><input type="submit" value="Next step"></form>';
    }
    else{
        echo "<span style='color:red'>Errors:</span><br>";
        foreach ($err as $e){
            echo "<span style='color:red'>&bull; {$e}</span><br>";
	}
	echo '<form id="setup" method="post" action="install.php?step=1"><input type="submit" value="Retry"></form>';
    }
    break;
            
    case 2: // Step 2
    
    echo'<div id="barre">>Step 2: Setup my database</div>
        <form action="install.php?step=2" method="post">
        <table>
            <tr>
                <td>Host: </td><td><input type="text" name="db_host" /></td>
            </tr>
            <tr>
                <td>Database name: </td><td><input type="text" name="db_name" /></td>
            </tr>
            <tr>
                <td>User: </td><td><input type="text" name="db_user" /></td>
            </tr>
            <tr>
                <td>Password: </td><td><input type="password" name="db_password" /></td>
            </tr>
            <tr>
                <td colspan="2"><input type="checkbox" name="db_create" checked="checked"/> Try to create the database if it doesn\'t exist</td>
            </tr>
            <tr>
                <td colspan="2" align="right"><input type="submit" name="add_database" value="Validate"></td>
            </tr>
        </table>
        </form>';
        
    if($_POST["add_database"]){
        // Try to connect
        $db_host = $_POST["db_host"];
        $db_name = $_POST["db_name"];
        $db_user = $_POST["db_user"];
        $db_password = $_POST["db_password"];

        $link = mysql_connect($db_host, $db_user, $db_password);
        if (!$link || $db_host == "" || $db_name == "" || $db_user == "" || $db_password == ""){ // If connection to the mysql server is impossible or a field is empty.
            echo "<span style='color:red'>Cannot connect to database using your settings! Please verify your information and try again. </span><br>";
        }
        else
        {
            $check_db = mysql_select_db($db_name);
            if (!$check_db){ // If connection to the database is impossible
                if($_POST["db_create"]){ // If checkbox has been checked
                    $connection = mysql_connect($db_host, $db_user, $db_password);
                    $create_db = mysql_query("CREATE DATABASE ".$db_name."",$connection);
                    $my_config_file = '../etc/config.ini';
                    $handle = fopen($my_config_file, 'w') or die('Cannot open file:  '.$my_config_file);
                    $data =  '[db]';
                    $data .= "\n".'driver=mysqli';
                    $data .= "\n".'host = "'.$db_host.'"';
                    $data .= "\n".'name = "'.$db_name.'"';
                    $data .= "\n".'user = "'.$db_user.'"';
                    $data .= "\n".'pass = "'.$db_password.'"';
                    fwrite($handle, $data);

                    echo '<span style="color:green">Congratulations, your database settings are correct and your config.ini file has been created!</span>
                    <form id="setup" method="post" action="install.php?step=3"><input type="submit" value="Next step"></form>';  
                }
                else{
                    echo '<span style="color:red">The database doesn\'t exist!</span><br>';
                }
            }
            if($check_db){ // Try to create config.ini file
                $my_config_file = '../etc/config.ini';
                $handle = fopen($my_config_file, 'w') or die('Cannot open file:  '.$my_config_file);
                $data =  '[db]';
                $data .= "\n".'driver=mysqli';
                $data .= "\n".'host = "'.$db_host.'"';
                $data .= "\n".'name = "'.$db_name.'"';
                $data .= "\n".'user = "'.$db_user.'"';
                $data .= "\n".'pass = "'.$db_password.'"';
                fwrite($handle, $data);

                echo '<span style="color:green">Congratulations, your database settings are correct and your config.ini file has been created!</span>
                <form id="setup" method="post" action="install.php?step=3"><input type="submit" value="Next step"></form>';  
            }
        }
    }
    break;
 
    case 3: // Step 3
    echo'<div id="barre">>Step 3: Import database</div>';
    
    if($_POST["import_database"]){
        // Parse config.ini and test database connection
        $cfg = @parse_ini_file(dirname(__FILE__)."/../etc/config.ini", true);
        if ($cfg)
        {
            $c = mysql_connect($cfg['db']['host'], $cfg['db']['user'], $cfg['db']['pass']);
            mysql_select_db($cfg['db']['name']);
            if (!$c){echo '<span style="color:red">Cannot connect to database using settings from etc/config.ini file. This operation can take a few seconds.</span><br>';}
            else {
                // Read the sql file
                $dbms_schema = '../../sql/scalr.sql';
                $sql_query = @fread(@fopen($dbms_schema, 'r'), @filesize($dbms_schema)) or die('Error with your sql file.');
                $sql_query = remove_remarks($sql_query);
                $sql_query = split_sql_file($sql_query, ';');
                $i=1;
                foreach($sql_query as $sql){
                    mysql_query($sql) or die('Invalid query: ' . mysql_error());
                }
                echo '<span style="color:green">Congratulations, your database has been imported!</span>
                <form id="setup" method="post" action="install.php?step=4"><input type="submit" value="Next step"></form>';
            }
        }
        else
        {
            echo '<span style="color:red">Cannot parse etc/config.ini file.</span><br>';
        }
    }
    else{
    echo '<form action="install.php?step=3" method="post">
    <table>
        <tr>
            <td colspan="2">Import the database from scalr.sql</td>
        </tr>
        <tr>
            <td colspan="2" align="right"><input type="submit" name="import_database" value="Import database"></td>
        </tr>
    </table>
    </form>';
    }
    break;
    
    case 4: // Step 4
    echo'<div id="barre">>Step 4: Generate Cryptokey </div>';
    
    if($_POST["generate_key"]){
        
        $key = file_get_contents('/dev/urandom', null, null, 0, 512);
        if (!$key)
            throw new Exception("Null key generated");

        if (!file_exists(dirname(__FILE__)."/../etc/.cryptokey"))
        {
            $key = substr(base64_encode($key), 0, 512);
            file_put_contents(dirname(__FILE__)."/../etc/.cryptokey", $key);
        }
        echo '<span style="color:green">Congratulations, your cryptokey has been generated!</span>
        <form id="setup" method="post" action="install.php?step=5"><input type="submit" value="Next step"></form>';
    }
    else{
    echo '<form action="install.php?step=4" method="post">
    <table>
        <tr>
            <td colspan="2">Generate etc/cryptokey</td>
        </tr>
        <tr>
            <td colspan="2" align="right"><input type="submit" name="generate_key" value="Generate"></td>
        </tr>
    </table>
    </form>';
    }
    break;
    
    case 5: // Step 4
    echo'<div id="barre">>Step 5: Installation finished! </div>';

    echo '<form action="install.php?step=4" method="post">
    <table>
        <tr>
            <td colspan="2"><span style="color:green">Congratulations your installation is now complete, please remove install.php and set permissions of your /etc/ folder to 0644.<br /><br />
			Now you can login to Scalr using <b>admin / admin.</b><br /><br />
			Don\'t forget to set up Scalr cronjobs. More information here: <a href="http://wiki.scalr.net/display/docs/Open-Source+Installation#Open-SourceInstallation-Setcronjobs">[Wiki]</a></span></td>
        </tr>
    </table>
    </form>';
    
    break;
}
echo '</div></body>';
?>
