<?php

/**
 * Return a list of Youtube video ID and properties from a Shreddit page
 *
 * The function first checks a cached version and if fresh enough serve it.
 *
 * Array returned :
             $items[] = array(
                'id'          => $id,
                'title'       => $title,
                'comments'    => $comment_url,
                'comment_num' => $comment_num,
                'style'       => $style,
            );
 *
 * @param  string $page  Shreddit page to fetch (ie 'new' or 'hot')
 * @return array         array of video ID and properties
 */
function shr_get_playlist( $page = 'hot' ) {

    // Accept either 'hot' or 'new'
    $page = ( $page == 'hot' ? 'hot' : 'new' );

    $cachefile = CACHE_FILE . $page . '.php';

    // Serve from the cache if it is younger than allowed cache time
    if ( file_exists( $cachefile ) && filesize( $cachefile ) > 10 && ( time() - CACHE_TIME < filemtime( $cachefile ) ) ) {
        include( $cachefile );
        return $playlist;
    }

    // Serve fresh otherwise
    ob_start(); // start the output buffer

    switch( $page ) {
        case 'new':
            $url = REDDIT . 'new/';
            break;
        case 'hot':
        default:
            $url = REDDIT;
    }

    $playlist = array();

    // Parse front page, page 2 and page 3
    for ( $i = 1; $i <= 3; $i++ ) {
        $page     = shr_get_youtube_items( $url );
        $playlist = array_merge( $playlist, $page['items'] );
        $url      = $page['next'];
        usleep( 500000 );
    }
    
    echo '<' . "?php\n";
    echo '$playlist = ';
    var_export( $playlist );
    echo ";\n?>\n";
    
    // open the cache file for writing
    $fp = fopen( $cachefile, 'w' ); 

    // save the contents of output buffer to the file
    $data = ob_get_contents();
    fwrite( $fp, $data );
    fclose( $fp ); 
    ob_end_clean();

    return $playlist;
}


/**
 * Get array of Youtube videos and their properties from a Shreddit page, and URL of next page
 *
 * Properties we want from Youtube videos:
 *     - Youtube video ID
 *     - Reddit submission title
 *     - Reddit submission style (eg "Melodeath"), either in flair or in the title itself
 *     - Reddit comment page URL
 *     - Number of comments
 *
 * @param  string $url  URL to parse
 * @return array        array of ( 'items' => array of vids & properties, 'next' => next page URL )
 */
function shr_get_youtube_items( $url ) {
    $items = array();
    include_once( __DIR__ . '/simplehtmldom/simple_html_dom.php' );
    $html = str_get_html( shr_get_page( $url ) );
    
    // Parse page for Youtube URLs and get their IDs
    foreach( $html->find( 'div.entry' ) as $item ) {
        
        $href = $item->find( 'p.title a.title' );
        $href = $href[0]->attr['href'];

        if( shr_is_youtube( $href ) ) {
            $id = shr_get_youtube_id( $href );
            
            $title = $item->find( 'p.title a.title', 0 )->innertext;
            $style = shr_get_style( $title );
            
            $comments    = $item->find( 'ul.flat-list a.comments' );
            $comment_url = $comments[0]->attr['href'];
            $comment_num = $comments[0]->innertext;
            
            $flair = $item->find( 'span.linkflairlabel' );
            if( $flair ) {
                $flair = $flair[0]->innertext;
                $style = array_merge( $style, shr_get_style( $flair ) );
            }
            
            $items[ $id ] = array(
                'id'          => $id,
                'title'       => $title,
                'comments'    => $comment_url,
                'comment_num' => $comment_num,
                'style'       => $style,
            );
            
        }
        
    }
    
    // Parse page for "Next page" link and get its href
    $next = $html->find('span.nextprev a[rel*="next"]');
    $next = $next[0]->attr['href'];

    return array(
        'items' => $items,
        'next'  => $next,
    );
}


/**
 * Check if URL is from Youtube
 *
 * Look for http(s)://(www.)youtu(.be|be.com)
 *
 * @param  string $url  URL to check
 * @return boolean     true if is Youtube, false otherwise  
 */
function shr_is_youtube( $url ) {
    return ( 1 == preg_match( '!^https?://(www\.)?youtu[\.be|be.com]!', $url ) );
}


/**
 * Return styles (ie [text between brackets]) found in text, and strip text from styles
 *
 * @param string $text  Text to parse
 * @return array        Array of string styles, ie array( 'Death', 'Black' ), or an empty array if no style found
 */
function shr_get_style( &$text ) {
    preg_match( '/\[([^\]]+)\]/', $text, $matches );
    if( $matches ) {
        $text = trim( str_replace( $matches[0], '', $text ) );
        $style = explode( '/', $matches[1] );
        // Ucfirst, and remove "New release"
        $style = array_diff( $style, array( 'New release' ) );
        $style = array_map( 'ucfirst', $style );
        return $style;        
    } else {
        return array();
    }
}


/**
 * Return Youtube video ID from a URL
 *
 * The video ID is 'OmGM3T4L' in 'https://www.youtube.com/watch?v=OmGM3T4L' or from any other
 * variation of the Youtube URL (ie youtu.be, http or https, etc)
 *
 * @param  string $url  URL to check
 * @return string      video ID
 */
function shr_get_youtube_id( $url ) {
    // https://www.youtube.com/watch?v=OmGM3T4L
    // http://youtu.be/OmGM3T4L
    // http://www.youtube.com/attribution_link?a=VGixIntYNbo&u=%2Fwatch%3Fv%3DOmGM3T4L%26feature%3Dshare
    // http://youtu.be/OmGM3T4L?t=1s
    
    $url = urldecode( $url );
    
    $host = str_replace( 'www.', '', parse_url( $url, PHP_URL_HOST ) );
    
    switch( $host ) {
        case 'youtube.com':
            preg_match( '/\?v=([^&#\?]*)/', $url, $matches );
            return $matches[1];
            break;
            
        case 'youtu.be':
            preg_match( '!be/([^&#\?]*)!', $url, $matches );
            return $matches[1];
            break;

    }
}


/**
 * Return HTML content of a URL (a simple cURL wrapper)
 *
 * @param  string $url  URL to fetch
 * @return string      HTML content
 */
function shr_get_page( $url ) {
    $ch = curl_init();
    curl_setopt( $ch, CURLOPT_URL, $url );
    curl_setopt( $ch, CURLOPT_HEADER, 0 );
    curl_setopt( $ch, CURLOPT_RETURNTRANSFER, true );
    curl_setopt( $ch, CURLOPT_TIMEOUT, 10 );
    $output = curl_exec( $ch );
    curl_close( $ch );
    return $output;    
}

