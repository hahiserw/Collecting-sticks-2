var c = require('./consts');

var fs = require('fs');
var ws = require('ws');
var session = require('express-session');
var createError = require('http-errors');
var Player = require('./lib/player');
var Stick = require('./lib/stick');

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

var usedModels = [];

function getAnotherAvailableModel() {
  var choices = [];
  files.players.forEach(function(c) {
    if (!(c in usedModels))
      choices.push(c);
  });

  if (choices.length) {
    var model = choices[choices.length * Math.random() | 0];
    usedModels.push(model);

    return model;
  }

  return null;
}

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
    const model = req.body.model || getAnotherAvailableModel();
    var simultaneousSticks = req.body.simultaneousSticks || 2;

    // clamp
    simultaneousSticks = Math.min(
      Math.max(simultaneousSticks, c.FORM_SIMULTANEOUS_STICKS_MIN),
      c.FORM_SIMULTANEOUS_STICKS_MAX
    );

    // validate?
    name = name.substring(0, c.FORM_ROOM_NAME_LENGTH).trim();

    const player = new Player(
      model,
      (c.BOARD_WIDTH - c.PLAYER_WIDTH) * Math.random() | 0,
      (c.BOARD_HEIGHT - c.PLAYER_HEIGHT) * Math.random() | 0,
    );

    var id = 0;

    if (submit === 'new') {
      if (!name) {
        renderError(res, 403, 'Invalid room name');
        return;
      }

      id = Object.keys(gameData).length;

      gameData[id] = {
        name: name,
        background: background,
        players: {
          [model]: player,
        },
        sticks: [],
        simultaneousSticks: simultaneousSticks,
      };
    } else {
      id = parseInt(submit, 10);

      if (!(id in gameData)) {
        renderError(res, 404, 'No such room');
        return;
      }

      if (!model || (model in gameData[id].players)) {
        renderError(res, 403, 'Player with the same model is already in the room');
        return;
      }

      gameData[id].players[model] = player;
    }

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

  eapp.get('/stylesheets/style.css', function(req, res, next) {
    res.type('css');
    res.send('.thumbnail { width: ' + c.PLAYER_WIDTH + 'px; height: '
      + c.PLAYER_HEIGHT + 'px; }\n'
      + '.background { width: '
      + (c.PLAYER_WIDTH * files.players.length) + 'px; height: '
      + (c.PLAYER_HEIGHT) + 'px; }\n');
  });

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
      ws.send(JSON.stringify({event: 'error', data: {error: 'No such game'}}));
      ws.terminate();
      return;
    }

    if (!model) {
      ws.send(JSON.stringify({event: 'error', data: {error: 'No model'}}));
      ws.terminate();
      return;
    }

    gameData[id].players[model].setWs(ws);

    var data = {
      event: 'init',
      data: {
        files: files,
        players: {},
        background: gameData[id].background,
        model: model,
      },
    };

    data.data.players[model] = gameData[id].players[model].getData();

    console.log(id, 'join', model);
    ws.send(JSON.stringify(data));

    // send join message to everybody
    // wss.clients.forEach(function(client) {
    //   if (client === ws || client.readyState !== ws.OPEN)
    //     return;
    //   console.log('join broadcast', model);

    //   var joinData = {
    //     event: 'join',
    //     data: data.data,
    //   };

    //   ws.send(JSON.stringify(joinData));
    // });

    ws.on('message', function(message) {
      // console.log('ws message', message.toString());

      if (!(id in gameData) || !(model in gameData[id].players))
        return;

      var players = gameData[id].players;
      var sticks = gameData[id].sticks;

      var player = players[model];

      var data = {event: '', data: {}};
      try {
        data = JSON.parse(message);
      } catch(error) {}

      switch (data.event) {
      case 'pos':
        // XXX server should check if position changes only slightly
        // no teleportation allowed :)
        player.x = data.data.x;
        player.y = data.data.y;

        // check if player is colliding with a stick and if so, add points and
        // remove the stick
        var toDelete = [];
        for (var innerModel in players) {
          var innerPlayer = players[innerModel];

          for (var i = 0; i < sticks.length; i++) {
            var stick = sticks[i];

            if (innerPlayer.isCollidingWith(stick, c.STICK_MARGIN_COLLECT)) {
              innerPlayer.points++;
              toDelete.push(i);
            }
          }
        }

        var newSticks = [];
        for (var i = 0; i < sticks.length; i++) {
          if (toDelete.indexOf(i) === -1)
            newSticks.push(sticks[i]);
        }

        gameData[id].sticks = newSticks;
        break;

      case 'msg':
        player.say(data.data.message);
        break;
      }
    });

    ws.on('close', function() {
      console.log(id, 'leave', model);

      // send leave message to everybody
      // wss.clients.forEach(function(client) {
      //   if (client === ws || client.readyState !== ws.OPEN)
      //     return;
      //   console.log('leave broadcast', model);

      //   var leaveData = {
      //     event: 'leave',
      //     data: data.data,
      //   };

      //   ws.send(JSON.stringify(leaveData));
      // });

      delete gameData[id].players[model];

      // delete the room if the last player left
      if (Object.keys(gameData[id].players).length === 0) {
        delete gameData[id];
      }
    });
  });

  setInterval(function() {
    // send room data to every player in the room
    for (var id in gameData) {
      const players = gameData[id].players;
      const sticks = gameData[id].sticks;

      var data = {players: {}, sticks: []};

      for (var model in players) {
        data.players[model] = players[model].getData();
      }

      for (var i = 0; i < sticks.length; i++) {
        data.sticks[i] = sticks[i].getData();
      }

      for (var model in players) {
        const ws = players[model].getWs();

        if (!ws)
          continue;

        ws.send(JSON.stringify({
          event: 'data',
          data: data,
        }));
      }
    }
  }, c.TIME_DATA_BROADCAST);

  setInterval(function() {
    for (var id in gameData) {
      var sticks = gameData[id].sticks;
      var players = gameData[id].players;

      for (var i = 0; i < gameData[id].simultaneousSticks - sticks.length; i++) {
        // generate position again if the stick is colliding with a player
        var x, y, stick, again;
        do {
          again = false;
          x = Math.random() * (c.BOARD_WIDTH - c.STICK_WIDTH) | 0;
          y = Math.random() * (c.BOARD_HEIGHT - c.STICK_HEIGHT) | 0
          newStick = new Stick(Math.random() * 2 | 0, x, y);

          for (var model in players) {
            var player = players[model];

            if (again)
              break;
            else
              again = newStick.isCollidingWith(player, c.STICK_MARGIN_PLACE);
          }

          for (var i = 0; i < sticks.length; i++) {
            var stick = sticks[i];

            if (again)
              break;
            else
              again = newStick.isCollidingWith(stick, c.STICK_MARGIN_PLACE);
          }
        } while(again);

        sticks.push(newStick);
      }
    }
  }, c.TIME_STICK_GENERATE);
}

module.exports = app;
