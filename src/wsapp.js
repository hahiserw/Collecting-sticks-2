var c = require('./consts');
var u = require('./lib/utils');

var fs = require('fs');
var ws = require('ws');
var session = require('express-session');
var createError = require('http-errors');
var Game = require('./lib/game');

var gameData = {};

var files = {
  players: [],
  backgrounds: [],
  sticks: [],
};

// read file names without extensions
for (folder in files) {
  files[folder] = fs.readdirSync('./src/public/graphics/' + folder);
  for (file in files[folder]) {
    var f = files[folder][file];
    files[folder][file] = f.substring(0, f.indexOf('.'));
  }
}

var sessionParser = session({
  saveUninitialized: false,
  secret: 'shhh',
  resave: false,
});

function renderError(res, status, message) {
  res.status(status).render('error', {
    message: message,
    error: {
      status: status,
      stack: 'Something went wrong',
    },
  });
}

var app = function(wss, eapp, server) {
  eapp.use(sessionParser);

  eapp.get('/', function(req, res, next) {
    res.render('index', {
      title: 'Collecting sticks 2',
      files: files,
      rooms: gameData,
      c: c,
    });
  });

  eapp.post('/', function(req, res, next) {
    var name = req.body.name || '';
    const background = req.body.background || files.backgrounds[0];
    const submit = req.body.submit || 'new';
    var model = req.body.model;
    var simultaneousSticks = parseInt(req.body.simultaneousSticks, 10)
      || c.FORM_SIMULTANEOUS_STICKS_DEFAULT;
    var roundTime = parseInt(req.body.time, 10);
    var roundSticks = parseInt(req.body.sticks, 10);

    if (roundTime === NaN)
      roundTime = c.FORM_TIME_DEFAULT;
    if (roundSticks === NaN)
      roundSticks = c.FORM_STICKS_DEFAULT;

    // clamp
    simultaneousSticks = Math.min(
      Math.max(simultaneousSticks, c.FORM_SIMULTANEOUS_STICKS_MIN),
      c.FORM_SIMULTANEOUS_STICKS_MAX
    );
    roundTime = Math.min(
      Math.max(roundTime, c.FORM_TIME_MIN),
      c.FORM_TIME_MAX
    );
    roundSticks = Math.min(
      Math.max(roundSticks, c.FORM_STICKS_MIN),
      c.FORM_STICKS_MAX
    );

    // validate?
    name = name.substring(0, c.FORM_ROOM_NAME_LENGTH).trim();

    var id = 0;

    if (submit === 'new') {
      if (!name) {
        renderError(res, 403, 'Invalid room name');
        return;
      }

      id = Object.keys(gameData).length;

      gameData[id] = new Game(name, background, simultaneousSticks, roundTime, roundSticks);
    } else {
      id = parseInt(submit, 10);

      if (!(id in gameData)) {
        renderError(res, 404, 'No such room');
        return;
      }

      if (gameData[id].isModelInPlayers(model)) {
        renderError(res, 403, 'Player with the same model is already in the room');
        return;
      }
    }

    if (!model)
      model = gameData[id].getAnotherAvailableModel(files.players);

    if (!model) {
      renderError(res, 403, 'The room is full');
      return;
    }

    gameData[id].addPlayer(model);

    req.session.gameId = id;
    req.session.model = model;

    res.redirect('/game/' + id);
  });

  eapp.get('/game/:id', function(req, res, next) {
    const id = parseInt(req.params.id, 10);

    if (!(id in gameData)) {
      renderError(res, 404, 'No such room');
      return;
    }

    res.render('game', {
      title: 'Collecting sticks 2',
      c: c,
    });
  });

  // dynamic styles
  eapp.get('/stylesheets/style.css', function(req, res, next) {
    res.type('css');
    res.send('.thumbnail { width: ' + c.PLAYER_WIDTH + 'px; height: '
      + c.PLAYER_HEIGHT + 'px; }\n'
      + '.background { width: '
      + (c.PLAYER_WIDTH * files.players.length) + 'px; height: '
      + (c.PLAYER_HEIGHT) + 'px; }\n');
  });

  // pass all consts to client
  eapp.get('/scripts/consts.js', function(req, res, next) {
    var consts = '';

    for (var v in c)
      if (typeof c[v] === 'string')
        consts += 'const ' + v + ' = "' + c[v].replace(/"/g, '\\"') + '";\n';
      else
        consts += 'const ' + v + ' = ' + c[v] + ';\n';

    res.type('js');
    res.send(consts);
  });

  eapp.get('/about', function(req, res, next) {
    res.render('about', {
      title: 'Collecting sticks 2 - About',
    });
  });

  // catch 404 and forward to error handler
  eapp.use(function(req, res, next) {
    next(createError(404));
  });

  // error handler
  eapp.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');

    // log server error to console
    if (!err.status || err.status >= 500)
      console.log(err);
  });

  function onError(error) { console.error(error) }

  // pass session to websocket server
  server.on('upgrade', function(req, socket, head) {
    socket.on('error', onError);

    sessionParser(req, {}, function() {
      socket.removeListener('error', onError);

      wss.handleUpgrade(req, socket, head, function(ws) {
        wss.emit('connection', ws, req);
      });
    });
  });

  wss.on('connection', function(ws, req, client) {
    ws.on('error', console.error);

    const id = req.session.gameId;
    const model = req.session.model;

    console.log('ws request', req.url, id);

    if (!(id in gameData)) {
      u.sendData(ws, 'error', {error: 'No such game'});
      ws.terminate();
      return;
    }

    if (!model) {
      u.sendData(ws, 'error', {error: 'No model'});
      ws.terminate();
      return;
    }

    // the player refreshed the page, the player object has been deleted by now
    if (!gameData[id].isModelInPlayers(model)) {
      u.sendData(ws, 'error', {error: 'Can\'t rejoin'});
      ws.terminate();
      return;
    }

    gameData[id].getPlayer(model).setWs(ws);

    var data = {
      files: files,
      players: {
        [model]: gameData[id].getPlayer(model).getData()
      },
      background: gameData[id].background,
      model: model,
    };

    console.log(id, 'join', model);
    u.sendData(ws, 'init', data);

    ws.on('message', function(message) {
      // console.log('ws message', message.toString());

      if (!(id in gameData) || !gameData[id].isModelInPlayers(model))
        return;

      const game = gameData[id];
      const player = game.getPlayer(model);

      if (player.lastRequest >
        Date.now() - c.TIME_CLIENT_DATA_BROADCAST * c.PLAYER_REQUEST_THRESHOLD)
        return;

      player.lastRequest = Date.now();

      var data;
      try {
        data = JSON.parse(message);
      } catch(error) {
        data = {};
      }

      switch (data.event) {
      case 'pos':
        // check if player's position changes only slightly and move them
        // no teleportation allowed :)
        player.moveTo(data.data.x, data.data.y);
        game.updateSticks();
        break;

      case 'msg':
        player.say(data.data.message);
        break;
      }
    });

    ws.on('close', function() {
      console.log(id, 'leave', model);

      var game = gameData[id];

      if (!game)
        return;

      game.deletePlayer(model);

      // delete the room if the last player left
      if (Object.keys(game.players).length === 0) {
        game.end();
        delete gameData[id];
      }
    });
  });
};

module.exports = app;
