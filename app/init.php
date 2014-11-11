<?php
/**
 * Shreddit Player init file
 */
 
define( 'CACHE_FILE', __DIR__ . '/cache/cache.' );  // files will be named cache.hot.php and cache.new.php
define( 'CACHE_TIME', 60 * 5 ); // 5 minutes

define( 'REDDIT', 'http://www.reddit.com/r/Metal/' ); // Sub Reddit -- trailing slash please -- configure this also in assets/js/app.js

include( __DIR__ . '/functions.php' );

