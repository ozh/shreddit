/**
 * Shreddit Player javascript component
 *
 * Tap into https://developers.google.com/youtube/iframe_api_reference
 * and do the shredding
 */

// global variables for the player
var player;         // Youtube object
var current_song;   // Youtube ID of the currently playing song, ie 'OmG_MeT4l' in 'https://www.youtube.com/watch?v=OmG_MeT4l'
var shredlist;      // Shreddit playlist
                    /* Structure of the shredlist object:
                       shredlist = {
                            'OmG_MeT4l' : { 
                                id:          'OmG_MeT4l,
                                title:       'Awesome Band - This song ends all songs',
                                comments:    'http://www.reddit.com/r/Metal/comments/2kvlt4u/awesome_band_this_song_ends_all_songs/',
                                style:       [ 'Death', 'Melodeath', 'Kvlt Metal' ],
                                comment_num: '1337 comment'
                            },
                            ...
                       }
                    */

/************************** let the shredding begin **************************/

/**
 * This function gets called when API is ready to use
 */
function onYouTubePlayerAPIReady() {
    // create the global player from the specific iframe (#video)
    player = new YT.Player( 'video', {
        events: {
            'onReady': onPlayerReady,
            'onError': onPlayerError,
            'onStateChange':onPlayerChange
        }
    });
}


/**
 * Callback function triggered when player changes state
 */
function onPlayerChange( event ) {
    switch( event.data ) {
        case -1:
            // unstarted
            loading( 'stop' );
            break;
        case 0:
            // ended -- reload playlist if we just played the last song
            if( ( player.getPlaylistIndex() + 1 ) == Object.keys( shredlist ).length ) {
                get_playlist_and_play();
            }
            break;
        case 1:
            // playing
            loading( 'stop' );
            break;
        case 2:
            // paused
            loading( 'stop' );
            break;
        case 3:
            // buffering
            loading( 'start' );
            break;
        case 5:
            // cued
            loading( 'stop' );
            player.playVideo();
            break;
    }
    
    // Update play button state if needed    
    if( is_playing() ) {
        button_play_show( 'pause' );
    } else {
        button_play_show( 'play' );
    }
    
    // Update "Currently playing" if needed
    var current = player.getPlaylist() [ player.getPlaylistIndex() ];
    if( current_song != current ) {
        current_song = current;
        update_currently(  shredlist[ current ] );
    }

}


/**
 * Callback function triggered when player is ready
 */
function onPlayerReady(event) {
    bind_controls();
    player.setLoop( false );
    get_playlist_and_play();
}


/**
 * Callback function triggered when player encounters an error
 */
function onPlayerError( event ) {
    // event.data : 100, 101, 150 : log that song is skipped (not embeddable), load next song
    if( $.inArray( event.data, [ "100", "101", "150" ] ) ) {
        log_skipped(  shredlist[ current_song ] );
        player.nextVideo();
    }
}



/**
 * Check if the player is playing or paused
 * Return true if playing, false otherwise.
 * For list of getPlayerState() possible values, see onPlayerChange()
 */
function is_playing() {
    return player.getPlayerState() == 1;
}


/**
 * Change appearance of Play button
 * Usage:
 *    button_play_show( 'pause' ) to show the Pause icon
 *    button_play_show( 'play' )  to show the Play icon
 */
function button_play_show( what ) {
    if( what == 'pause' ) {
        $("#play").removeClass('paused').addClass('playing');
    } else {
        $("#play").removeClass('playing').addClass('paused');
    }
}


/**
 * Get URL fragment (ie #top or #new) if exists, or "hot" if none, and load playlist
 */
function get_playlist_and_play() {
    var hash = location.hash.substring( location.hash.indexOf('#')+1 );
    get_playlist( hash ? hash : 'hot' );
}


/**
 * Toggle the wicked "Loading" animation.
 * Usage: 
 *    loading( 'start' )
 *    loading( 'stop' )
 */
function loading( startstop ) {
    var degrees = Math.floor(Math.random() * 25) - 12;
    $('#loading')
        .toggle( startstop == 'start' )
        .css({'-webkit-transform' : 'rotate('+ degrees +'deg)',
             '-moz-transform' : 'rotate('+ degrees +'deg)',
             '-ms-transform' : 'rotate('+ degrees +'deg)',
             'transform' : 'rotate('+ degrees +'deg)'});
}


/**
 * Get video playlist from given page.
 */
function get_playlist( page ) {
    page = ( page == 'new' ? 'new' : 'hot' );
    loading( 'start' );
    
    $.post(
        "app/ajax.php",
        { action: "get_playlist", page: page },
        function( data ) {
            // On success, stop animation, initialize playlist and inject it into the player
            loading( 'stop' );
            shredlist = data;
            
            // Update the playlist text
            $( '#cue' ).show( 'slow' );
            $( '#cue_count' ).html( Object.keys( shredlist ).length );
            var url = 'http://www.reddit.com/r/Metal/' + ( page == 'hot' ? '' : 'new/' );
            $( '#cue a' ).attr( 'href', url ).html( page );
            
            // Load playlist into the player and ROCK ON \m/
            player.cuePlaylist( Object.keys( shredlist ) );
        }
    );
}


/**
 * Bind buttons and shit to their functions
 */
function bind_controls() {
    $( "#play" ).click(function() {
        if( is_playing() ) {
            player.pauseVideo();
        } else {
            player.playVideo();
        }
    });
    
    $( "#stop" ).click(function() {
        player.stopVideo();
    });
    
    $( "#next" ).click(function() {
        player.nextVideo();
    });
    
    $( "#prev" ).click(function() {
        player.previousVideo();
    });
    
    // The "Hot" and "New" reload buttons
    $( "#hotnew .playlist" ).click( function( e ) {
        var target = $(this).attr('id');
        
        // change URL fragment without redirection or scrolling if the browser supports it
        if ( history.pushState ) {
            window.history.pushState( null, null, "#" + target );
        } else {
            e.preventDefault();
            window.location.hash = target;
        }
        
        get_playlist( target );
    });
    
}


/**
 * Append song data to the skipped section
 * Needs a song object as input parameter, with properties 'id', 'title' etc... -- see "Structure of the shredlist object"
 */
function log_skipped( song ) {
    var skipped_info = '<a href="https://www.youtube.com/watch?v='+ song.id + '">' + song.title + '</a> (<a href="'+ song.comments + '">' + song.comment_num + '</a> on /r/Metal/)';
    var skipped_line = '<li id="skipped_'+ song.id +'">' + skipped_info + '</li>';
    
    $('#skipped').show( 'slow' );
    
    if( $('#skipped ul li#skipped_' + song.id ).length ) {
        // update info (in case the Reddit comment numer has change for instance)
        $('#skipped ul li#skipped_' + song.id ).html( skipped_info );
    } else {
        // Append one element to the list
        $('#skipped ul').append( skipped_line );
    }
    
}


/**
 * Update the "Currently playing" data
 * Needs a song object as input parameter, with properties 'id', 'title' etc... -- see "Structure of the shredlist object"
 */
function update_currently( song ) {
    $('#currently').show( 'slow' );
    $('#cur_song').html( '<a href="https://www.youtube.com/watch?v='+ song.id + '">' + song.title + '</a>' );
    $('#cur_comments').html( '<a href="'+ song.comments + '">' + song.comment_num + '</a> on /r/Metal/' );
    
    update_page_title( song.title );
    
    var style;
    if( song.style.length ) {
        style = song.style.join(", ");
    } else {
        style = 'Unspecified genre... You decide! \m/'
    }
    $('#cur_style').html( style );
    
}


/**
 * Change the page title with the song title (trimmed down to 30 chars if longer)
 */
function update_page_title( song_title ) {
    if ( song_title.length > 30) {
        song_title = song_title.substr(0, 27) + '...';
    }

    document.title = ( song_title ? song_title + ' - ' : '' ) + "SHREDDIT PLAYER";
}


// Inject YouTube API script asynchronously -- when done, function onYouTubePlayerAPIReady() will be fired
/**/
var tag = document.createElement('script');
tag.src = "//www.youtube.com/player_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
/**/

