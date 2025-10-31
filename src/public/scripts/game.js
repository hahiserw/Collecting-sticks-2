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


var Game = function(uri) {
  this.uri = uri;

  this.you = null;

  this.players = {};

  this.sticks = [];

  this.keys = [];

  this.files = {};

  this.graphics = {
    set: {},
    players: {},
    backgrounds: {},
    sticks: [],
  };

  this.time = null;
  this.sticksLeft = 0;
  this.winner = null;

  this.updating = null;

  this.bot = false;

  this.logElement = null;
  this.canvas = null;
  this.ctx = null;

};

Game.prototype.log = function( text ) {

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

  this.logElement.innerHTML = time + ": " + text + "\n" + this.logElement.innerHTML;

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

  this.logElement = document.getElementById( statusId );

  // TODO rewrite to use promises
  this.log( "Initializing Game..." );
  this.log( "Creating Game environment." );
  this.initCanvas( canvasId );
  this.log( "Connecting to server..." );
  this.connect( function() {
    this.log( "Connected." );
    this.log( "Starting listening for players data change." );
    this.dataListener();
    this.log( "Loading resources..." );
    this.loadResources( function() {
      this.log( "Done loading all resources." );
      this.log( "Preparing Game environment." );
      this.setCanvas();
      this.log( "Environment prepared." );
      this.log( "Starting update function." );
      this.postman( true );
      this.log( "Launching Game." );
      done.call( this );
    }.bind( this ) );
  }.bind( this ), function( error ) {
    switch( error.number ) {
      case 1:
        this.log( "Server is on. Yet cannot connect." );
        break;
      case 2:
        this.log( "Server is probably down." );
        break;
      default:
        this.log( "Unknown server error." );
    }
  } );

}

Game.prototype.initCanvas = function( id ) {

  this.canvas = document.getElementById( id );
  this.ctx = this.canvas.getContext( "2d" );

  if( !this.canvas )
    this.log( "Lol, canvas problem? What noob did let it happen?" );

  if( !this.ctx )
    this.log( "Cannot create canvas context. Try another browser." );

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
      this.log( "Trying to connect..." );
    }
  }.bind( this ), 1000 );

  this.ws = new WebSocket(this.uri);

  this.ws.addEventListener( "open", function(event) {
    console.log('ws open');
    // gotInit.call( this );
  } );

  if( !this.ws )
    gotError.call( this, 2 );

  this.ws.addEventListener( "error", console.error );

  this.ws.addEventListener( "message", function( event ) {
    var data;
    try {
      data = JSON.parse( event.data );
    } catch( error ) {
      data = {};
    }

    console.log( 'ws message', event.data );

    if( data.event === 'error' )
      onError.call( this, data.data );

    if( data.event === 'init' )
      onInit.call( this, data.data );

    // if( data.event === 'join' )
    //   onJoin.call( this, data.data );

    // if( data.event === 'leave' )
    //   onLeave.call( this, data.data );

    if( data.event === 'data' )
      onData.call( this, data.data );
  }.bind( this ));

  function onError( data ) {
    this.log( "Server error: " + data.error );
  }

  function onInit( data ) {
    clearTimeout( error );

    this.files = data.files;
    var models = Object.keys( data.players );
    var model = data.model;
    var player = data.players[model];

    this.you = new Player( model, player.x, player.y );

    // this.players.push( this.you );
    this.players[model] = this.you;

    // First one.
    this.graphics.set.background = data.background;
    this.graphics.set.sticks = data.files.sticks[0];

    gotInit.call( this );
  }

  function onJoin( data ) {
    this.players[data.model] = new Player( data.model, data.x, data.y );
  }

  function onLeave( data ) {
    delete this.players[data.model];
  }

  function onData( data ) {
    for( var model in data.players ) {
      var player = data.players[model];

      if( !this.players[model] ) {
        // XXX create player if no join message was received?
        this.players[model] = new Player( model, player.x, player.y );
      }

      this.players[model].setPoints( player.points );

      this.players[model].say( player.message );

      // don't update your position
      if( this.players[model] === this.you )
        continue;

      this.players[model].goTo( player.x, player.y );

    }

    // delete player if he is no longer in data
    for( var model in this.players ) {
      if( !( model in data.players ) ) {
        delete this.players[model];
      }
    }

    for( var i = 0; i < data.sticks.length; i++ ) {
      var stick = data.sticks[i];
      delete this.sticks[i];
      this.sticks[i] = new Stick( stick.model, stick.x, stick.y );
    }

    if( data.sticks.length === 0 )
      this.sticks = [];

    this.time = data.time;
    this.sticksLeft = data.sticksLeft;

    this.winner = data.winner;

    if( this.bot ) {
      var smallest = Infinity;
      var closest = null;

      // find the closest stick
      for( var i = 0; i < this.sticks.length; i++ ) {
        var stick = this.sticks[i];
        var d = Math.hypot( stick.x - this.you.getX(), stick.y - this.you.getY() );

        if( smallest > d ) {
          smallest = d;
          closest = stick;
        }
      }

      if( closest )
        this.you.goTo( closest.x, closest.y );
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
      this.log( "Loaded succesfuly: " + fileName + extension + "." );
      loaded.call( this, type, fileName, image );
    }.bind( this ), false );

    image.addEventListener( "error", function() {
      this.log( "Error loading image: " + fileName + extension + "." );
    }.bind( this ), false );

    image.src = "/graphics/" + type + "/" + fileName + extension;

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
        this.log( "Player " + model + " connected." );
      } else if( this.players[model] && !data[model] ) { // Player disconnected.
        delete this.players[model];
        this.log( "Player " + model + " disconnected." );
      }
    }
  }.bind( this ) );

  this.on( "join", function( data ) {

  }.bind( this ), false );

}

Game.prototype.setCanvas = function() {

  this.canvas.width = BOARD_WIDTH;
  this.canvas.height = BOARD_HEIGHT;

  this.ctx.font = "20px monospace";

  this.canvas.addEventListener( "click", function( event ) {
    var
      x = event.pageX - event.target.offsetLeft - PLAYER_WIDTH / 2,
      y = event.pageY - event.target.offsetTop - PLAYER_HEIGHT / 2;
    this.you.goTo( x, y );
  }.bind( this ), false );

}

Game.prototype.postman = function( start ) {

  if( !start ) {
    clearInterval( this.updating );
    return;
  }

  this.updating = setInterval( function() {
    var data = {
      event: 'pos',
      data: {
        x: this.you.getX(),
        y: this.you.getY(),
      },
    };

    this.ws.send( JSON.stringify( data ) );
  }.bind( this ), TIME_CLIENT_DATA_BROADCAST );

}

Game.prototype.say = function( message ) {
  var data = {
    event: 'msg',
    data: {
      message: message,
    },
  };

  this.ws.send( JSON.stringify( data ) );
};

Game.prototype.render = function() {

  this.playerMove();

  this.ctx.drawImage( this.graphics.backgrounds[this.graphics.set.background], 0, 0 );

  this.drawSticks();

  this.drawPlayers();

  this.drawPoints();

  this.drawInfo();

  this.drawWinner();

}

Game.prototype.drawSticks = function() {

  for( var i = 0; i < this.sticks.length; i++ ) {
    var stick = this.sticks[i];
    var
      x = stick.x,
      y = stick.y;

    if( !this.graphics.sticks[this.graphics.set.sticks] ) {
      throw new Error( "Can't find stick graphic" );
      return;
    }

    this.ctx.drawImage(
      this.graphics.sticks[this.graphics.set.sticks],
      stick.model * STICK_WIDTH, 0,
      STICK_WIDTH, STICK_HEIGHT,
      x, y,
      STICK_WIDTH, STICK_HEIGHT );
  }

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

  // Draw players with smaller y first.
  // Sort array every frame? D:
  // Or if one players is COL_HEIGHT odległości from another chceck whose y is
  // greater and draw him first.
  var sortedModels = Object.keys( this.players );
  sortedModels.sort( function( a, b ) {
    return this.players[a].getY() - this.players[b].getY();
  }.bind( this ) );

  for( var i = 0; i < sortedModels.length; i++ ) {
    var player = this.players[sortedModels[i]];
    var
      x = player.getX(),
      y = player.getY();

    player.tick();

    if( !this.graphics.players[player.model] ) {
      throw new Error( "Can't find player " + player.model + " graphic" );
      continue;
    }

    this.ctx.drawImage(
      this.graphics.players[player.model],
      player.getFrame() * PLAYER_WIDTH, player.getDirection() * PLAYER_HEIGHT,
      PLAYER_WIDTH, PLAYER_HEIGHT,
      x, y,
      PLAYER_WIDTH, PLAYER_HEIGHT );

    if( player.message ) {
      var messageWidth = this.ctx.measureText( player.message ).width;
      var recentFont = this.ctx.font;
      this.ctx.textAlign = "center";
      this.ctx.fillStyle = CANVAS_TEXT_BACKGROUND_COLOR;
      this.ctx.fillRect( x + PLAYER_WIDTH / 2 - messageWidth / 2, y - 17, messageWidth, 14 );
      this.ctx.fillStyle = CANVAS_TEXT_COLOR;
      this.ctx.font = "14px courier";
      this.ctx.fillText(
        player.message,
        x + PLAYER_WIDTH / 2,
        y - 5 );
      this.ctx.font = recentFont;
    }

  }

}

Game.prototype.drawPoints = function() {

  // Sort by points.
  var sortedModels = Object.keys( this.players );
  sortedModels.sort( function( a, b ) {
    return this.players[b].getPoints() - this.players[a].getPoints();
  }.bind( this ) );

  var
    x = 0,
    y = 0,
    spaceX = PLAYER_WIDTH * 2,
    spaceY = PLAYER_HEIGHT / 2;

  // Icon of character or thumbnail followed by a number.
  for( var i = 0; i < sortedModels.length; i++ ) {
    var player = this.players[sortedModels[i]];

    if( !this.graphics.players[player.model] ) {
      throw new Error( "Can't find player " + player.model + " graphic" );
      continue;
    }

    // Awesome thumbnail. :D
    this.ctx.drawImage(
      this.graphics.players[player.model],
      player.getFrame() * PLAYER_WIDTH, player.getDirection() * PLAYER_HEIGHT,
      PLAYER_WIDTH, PLAYER_HEIGHT,
      x + 10, y + 10,
      PLAYER_WIDTH / 2, PLAYER_HEIGHT / 2 );

    this.ctx.textAlign = "start";
    this.ctx.fillStyle = CANVAS_TEXT_BACKGROUND_COLOR;
    this.ctx.fillRect( x + 40, y + 13, 25, 20 );
    this.ctx.fillStyle = CANVAS_TEXT_COLOR;
    this.ctx.fillText( player.getPoints(), x + 40, y + 30, 25 );

    // In case too many players play.
    if( y + 2 * spaceY > BOARD_HEIGHT - spaceY ) {
      x += spaceX;
      y = 0;
    } else {
      y += spaceY;
    }

  }

}

Game.prototype.drawInfo = function() {

  var
    x = BOARD_WIDTH,
    y = 0;

  var timer = new Date(Math.abs(this.time) - 60 * 60 * 1000);
  var
    h = timer.getHours(),
    m = timer.getMinutes(),
    s = timer.getSeconds();
  var info =
    ( h < 10? "0" + h: h ) + ":" +
    ( m < 10? "0" + m: m ) + ":" +
    ( s < 10? "0" + s: s );

  info += " / " + Math.abs(this.sticksLeft);

  this.ctx.textAlign = "start";
  this.ctx.fillStyle = CANVAS_TEXT_BACKGROUND_COLOR;
  this.ctx.fillRect( x - 140, y + 13, 130, 20 );
  this.ctx.fillStyle = CANVAS_TEXT_COLOR;
  this.ctx.fillText( info, x - 140, y + 30, 130 );

}

Game.prototype.drawWinner = function() {

  if ( !this.winner )
    return;

  var
    x = BOARD_WIDTH / 2,
    y = BOARD_HEIGHT / 2;

  var info = this.winner + " wins!";

  this.ctx.textAlign = "center";
  this.ctx.fillStyle = CANVAS_TEXT_BACKGROUND_COLOR;
  this.ctx.fillRect( x - BOARD_WIDTH / 2, y + 13, BOARD_WIDTH, 20 );
  this.ctx.fillStyle = CANVAS_TEXT_COLOR;
  this.ctx.fillText( info, x, y + 30, BOARD_WIDTH );

}


// } () );
