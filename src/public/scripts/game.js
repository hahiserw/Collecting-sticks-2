/*

game
  init
    loadResources
  players
  environment
    hud
    draw
  render

*/
// ( function() {


var log, canvas, ctx; // OMG

// Constants.
var
  MAP_WIDTH = 512,
  MAP_HEIGHT = 384,
  PLAYER_WIDTH = 32,
  PLAYER_HEIGHT = 48;


var Game = function(uri) {
  this.uri = uri;

  this.you = undefined;

  this.players = {};

  this.keys = [];

  this.files = {};

  this.graphics = {
    set: {},
    players: {},
    backgrounds: {},
    items: {}
  };

};

Game.prototype.say = function( text ) {

  var now = new Date();
  var
    h = now.getHours(),
    m = now.getMinutes(),
    s = now.getSeconds(),
    ss = now.getMilliseconds();
  var time =
    ( h < 10? "0" + h: h ) + ":" +
    ( m < 10? "0" + m: m ) + ":" +
    ( s < 10? "0" + s: s ) + ":" +
    ( ss < 100? "0" + ( ss < 10? "0" + ss: ss ): ss );

  log.innerHTML = time + ": " + text + "\n" + log.innerHTML;

}

Game.prototype.launch = function( canvasId, statusId ) {

  var handle;

  function update() {

    handle = requestAnimationFrame( update.bind( this ) );

    // try {
      this.render();
    // } catch( error ) {
    //   cancelAnimationFrame( handle );
    //   throw error.message
    // }

  }

  this.init( canvasId, statusId, update );

}

Game.prototype.init = function( canvasId, statusId, done ) {

  log = document.getElementById( statusId );

  // TODO rewrite to use promises
  this.say( "Initializing Game..." );
  this.say( "Creating Game environment." );
  this.initCanvas( canvasId );
  this.say( "Connecting to server..." );
  this.connect( function() {
    this.say( "Connected." );
    this.say( "Starting listening for players data change." );
    this.dataListener();
    this.say( "Loading resources..." );
    this.loadResources( function() {
      this.say( "Done loading all resources." );
      this.say( "Preparing Game environment." );
      this.setCanvas();
      this.say( "Environment prepared." );
      this.say( "Starting update function." );
      this.postman();
      this.say( "Launching Game." );
      done.call( this );
    }.bind( this ) );
  }.bind( this ), function( error ) {
    switch( error.number ) {
      case 1:
        this.say( "Server is on. Yet cannot connect." );
        break;
      case 2:
        this.say( "Server is probably down." );
        break;
      default:
        this.say( "Unknown server error." );
    }
  } );

}

Game.prototype.initCanvas = function( id ) {

  canvas = document.getElementById( id );
  ctx = canvas.getContext( "2d" );

  if( !canvas )
    this.say( "Lol, canvas problem? What noob did let it happen?" );

  if( !ctx )
    this.say( "Cannot create canvas context. Try another browser." );

}

Game.prototype.on = function( event, done ) {
  var data = JSON.parse( "{}" );

  done( data );
};

Game.prototype.connect = function( gotInit, gotError ) {

  var tryNumber = 0;
  var error = setInterval( function() {
    if( tryNumber++ === 3 ) {
      gotError.call( this, 1 );
      clearTimeout( error );
    } else {
      this.say( "Trying to connect..." );
    }
  }.bind( this ), 1000 );

  this.ws = new WebSocket(this.uri);

  // this.ws.addEventListener( "open", function(event) {
  // } );

  if( !this.ws )
    gotError.call( this, 2 );

  this.ws.addEventListener( "error", console.error );

  this.ws.addEventListener( "message", function( event ) {
    var data = JSON.parse( event.data );

    console.log( 'ws message', event.data );

    if ( data.event === 'init' )
      onInit.call( this, data.data );

    // if ( data.event === 'join' )
    //   onJoin.call( this, data.data );

    if ( data.event === 'data' )
      onData.call( this, data.data );
  }.bind( this ));

  function onInit( data ) {
    clearTimeout( error );

    this.files = data.files;
    var models = Object.keys( data.players );
    var model = models[models.length - 1];
    var player = data.players[model];

    this.you = new Player( player.model, player.x, player.y );

    // this.players.push( this.you );
    this.players[player.model] = this.you;

    // First one.
    this.graphics.set["background"] = this.files.backgrounds[0];
    this.graphics.set["sticks"] = this.files.items[0];

    gotInit.call( this );
  }

  function onJoin( data ) {
    this.players[data.model] = new Player( data.model, data.x, data.y );
  }

  function onData( data ) {
    for ( var model in data ) {
      var player = data[model];

      // don't update your position
      if ( this.players[model] === this.you )
        continue;

      if ( !this.players[model] ) {
        // XXX create player if no join message was received?
        this.players[model] = new Player( model, player.x, player.y );
        continue;
      }

      this.players[model].goTo( player.x, player.y );

    }

    // delete player if he is no longer in data
    for ( var model in this.players ) {
      if ( !( model in data ) ) {
        delete this.players[model];
      }
    }
  }
}

// To do: Make this function awesome 'cause it's somehow not to good now.
Game.prototype.loadResources = function( doneLoading ) {

  function loadImage( type, fileName, loaded ) {

    var extension = "";

    if( fileName.indexOf( "." ) === -1 )
      extension = ".png";

    var image = new Image();

    image.addEventListener( "load", function() {
      this.say( "Loaded succesfuly: " + fileName + extension + "." );
      loaded.call( this, type, fileName, image );
    }.bind( this ), false );

    image.addEventListener( "error", function() {
      this.say( "Error loading image: " + fileName + extension + "." );
    }.bind( this ), false );

    image.src = "graphics/" + fileName + extension;

  }

  var
    total = 0,
    loaded = 0;

  for( var type in this.files )
    for( var name in this.files[type] )
      total++;

  for( var type in this.files ) {
    if( !this.graphics[type] )
      this.graphics[type] = {};
    for( var name in this.files[type] ) {
      var fileName = this.files[type][name];
      loadImage.call( this, type, fileName, function( type, fileName, resource ) {
        loaded++;
        this.graphics[type][fileName] = resource;
        if( loaded === total )
          doneLoading.call( this );
      } );
    }
  }

}

Game.prototype.dataListener = function() {

  this.on( "data", function( data ) {
    for( var model in data ) {
      if( model === this.model )
        continue;
      // Playes exists, so just get actual positions.
      if( this.players[model] && data[model] ) {
        this.players[model].goTo( data[model].x, data[model].y );
        this.players[model].setPoints( data[model].points );
        // this.players[model].message = data[model].message;
      } else if( !this.players[model] && data[model] ) { // Player connected.
        this.players[model] = new Player( model, data[model].x, data[model].y );
        this.say( "Player " + model + " connected." );
      } else if( this.players[model] && !data[model] ) { // Player disconnected.
        delete this.players[model];
        this.say( "Player " + model + " disconnected." );
      }
    }
  }.bind( this ) );

  this.on( "join", function( data ) {

  }.bind( this ), false );

}

Game.prototype.setCanvas = function() {

  canvas.width = MAP_WIDTH;
  canvas.height = MAP_HEIGHT;

  ctx.font = "20px monospace";

  canvas.addEventListener( "click", function( event ) {
    var
      x = event.pageX - event.target.offsetLeft,
      y = event.pageY - event.target.offsetTop;
    this.you.goTo( x, y );
  }.bind( this ), false );

}

Game.prototype.postman = function( stop ) {

  // Just for testing.
  if( this.ws.fake )
    return;

  var updating;

  if( stop ) {
    clearTimeout( updating );
    return;
  }

  updating = setInterval( function() {
    var data = {
      event: 'pos',
      data: {
        x: this.you.getX(),
        y: this.you.getY(),
        model: this.you.model,
      },
    };
    this.ws.send( JSON.stringify( data ) );
  }.bind( this ), 1000 );

}

Game.prototype.render = function() {

  ctx.drawImage( this.graphics["backgrounds"]["Grass"], 0, 0 );

  // this.drawSticks();

  this.playerMove();

  this.drawPlayers();

  this.drawPoints();

}

Game.prototype.drawSticks = function() {

  // Damn, nothing.

}

Game.prototype.playerMove = function() {

  // One key at the time.
  var key = this.keys.indexOf( true );
  
  if( key !== -1 ) {

    // Switch takes more time.
    if( key === 0 )
      this.you.move( -1, 0 );
    if( key === 1 )
      this.you.move( 0, -1 );
    if( key === 2 )
      this.you.move( 1, 0 );
    if( key === 3 )
      this.you.move( 0, 1 );

  } else {

    // Lame!
    this.you.stopAnimation();
    // this.you.move( 0, 0 );

  }

}

Game.prototype.drawPlayers = function() { // And chat messages.

  // Draw players with greater y first.
  // Sort array every frame? D:
  // Or if one players is COL_HEIGHT odległości from another chceck whom y is greater and draw him first.
  // this.players.sort( function( a, b ) {
  //   return a.y - b.y;
  // } );

  for( var id in this.players ) {

    var player = this.players[id];
    var
      x = player.getX(),
      y = player.getY();

    player.tick();

    if ( !this.graphics["players"][player.model] )
      continue;

    ctx.drawImage(
      this.graphics["players"][player.model],
      player.getFrame() * PLAYER_WIDTH, player.getDirection() * PLAYER_HEIGHT,
      PLAYER_WIDTH, PLAYER_HEIGHT,
      x, y,
      PLAYER_WIDTH, PLAYER_HEIGHT );

    if( player.message ) {
      var recentFont = ctx.font;
      ctx.font = "14px courier";
      ctx.fillText(
        player.message,
        x + PLAYER_WIDTH / 2 - ctx.measureText( player.message ).width / 2,
        y - 5 );
      ctx.font = recentFont;
    }

  }

}

Game.prototype.drawPoints = function() {

  // Sort by points... It will take ages to render.
  // this.players.sort( function( a, b ) {
  //   return b.getPoints() - a.getPoints();
  // } );

  var
    x = 0,
    y = 0,
    spaceX = PLAYER_WIDTH * 2,
    spaceY = PLAYER_HEIGHT / 2;

  // Icon of character or thumbnail followed by a number.
  for( var id in this.players ) {

    var player = this.players[id];

    if ( !this.graphics["players"][player.model] )
      continue;

    // Awesome thumbnail. :D
    ctx.drawImage(
      this.graphics["players"][player.model],
      player.getFrame() * PLAYER_WIDTH, player.getDirection() * PLAYER_HEIGHT,
      PLAYER_WIDTH, PLAYER_HEIGHT,
      x + 10, y + 10,
      PLAYER_WIDTH / 2, PLAYER_HEIGHT / 2 );

    // No style is set.
    ctx.fillText( player.getPoints(), x + 40, y + 30/*, width*/ );

    // In case too many players plays.
    if( y + 2 * spaceY > MAP_HEIGHT - spaceY ) {
      x += spaceX;
      y = 0;
    } else {
      y += spaceY;
    }

  }

}


// } () );
