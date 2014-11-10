<?php
header( "Content-Type: application/json; charset=utf-8" );

if( !isset( $_REQUEST['action'] ) )
	die( '\\m/' );
    
include( __DIR__ . '/init.php' );    

// Pick action
$action = $_REQUEST['action'];
switch( $action ) {

	case 'get_playlist':
		$return = shr_get_playlist( $_REQUEST['page'] );
		echo json_encode($return);
		break;

}

die();

