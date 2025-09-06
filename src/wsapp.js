const FORM_ROOM_NAME_LENGTH = 50;

var ws = require('ws');
var session = require('express-session');
var createError = require('http-errors');

var gameData = {};

var initData = {
  files: {
    // TODO read from graphics folder
    players: ["Remilia", "Remilia2", "Asuka", "FunkyPencil", "Milonar", "Wesker"],
    backgrounds: ["Grass", "Space", "Fourleaf", "Comp"],
    items: ["Sticks"],
  },
};

var sessionParser = session({
  saveUninitialized: false,
  secret: 'shhh',
  resave: false,
});

var usedModels = [];

function getAnotherAvailableModel() {
  var choices = [];
  initData.files.players.forEach(function(c) {
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
      models: initData.files.players,
      backgrounds: initData.files.backgrounds,
      rooms: gameData,
      FORM_ROOM_NAME_LENGTH: FORM_ROOM_NAME_LENGTH,
    });
  });

  eapp.post('/', function(req, res, next) {
    var name = req.body.name || '';
    const background = req.body.background || '';
    const submit = req.body.submit || 'new';
    const model = req.body.model || getAnotherAvailableModel();

    // validate?
    name = name.substring(0, FORM_ROOM_NAME_LENGTH).trim();

    const newPlayer = {
      [model]: {
        model: model,
        x: (512 - 32) * Math.random() | 0,
        y: (384 - 32 - 16) * Math.random() | 0,
        points: 0,
      },
    };

    var id = 0;

    if (submit === 'new') {
      id = Object.keys(gameData).length;
      gameData[id] = {
        name: name,
        background: background,
        players: {
          [model]: newPlayer,
        },
      };
    } else {
      id = parseInt(submit, 10);
      gameData[id].players[model] = newPlayer;
    }

    req.session.gameId = id;
    req.session.model = model;

    res.redirect('/game/' + id);
  });

  eapp.get('/game/:id', function(req, res, next) {
    const id = parseInt(req.params.id, 10);
    const data = gameData[id];

    if (!data) {
      renderError(res, 404, 'No such room');
      return;
    }

    res.render('game', {
      title: 'Collecting sticks 2',
      data: data,
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

    if (isNaN(id)) {
      ws.send(JSON.stringify({event: 'error', data: {error: 'No such game'}}));
      ws.terminate();
      return;
    }

    if (!model) {
      ws.send(JSON.stringify({event: 'error', data: {error: 'No model'}}));
      ws.terminate();
      return;
    }

    // if (model in gameData[id].players) {
    //   ws.send(JSON.stringify({event: 'error', data: {error: 'Player already in game'}}));
    //   ws.terminate();
    //   return;
    // }

    // new player
    gameData[id].players[model] = {
      model: model,
      // TODO get from some consts
      x: (512 - 32) * Math.random() | 0,
      y: (384 - 32 - 16) * Math.random() | 0,
      points: 0,
      ws: ws,
    };

    var data = {
      event: 'init',
      data: {
        files: initData.files,
        players: {},
        background: gameData[id].background,
        model: model,
      },
    };

    data.data.players[model] = {
      model: model,
      x: gameData[id].players[model].x,
      y: gameData[id].players[model].y,
      points: gameData[id].players[model].points,
    };

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

      var data = {event: '', data: {}};
      try {
        data = JSON.parse(message);
      } catch(error) {}

      switch (data.event) {
      case 'pos':
        // XXX should get relative positions, not absolute, because an evil
        // player might teleport all over the place
        // OR server should check if position changes only slightly
        gameData[id].players[model].x = data.data.x;
        gameData[id].players[model].y = data.data.y;
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

      var data = {};

      for (var model in players) {
        data[model] = {
          model: model,
          x: players[model].x,
          y: players[model].y,
          points: players[model].points,
        };
      }

      for (var model in players) {
        const ws = players[model].ws;

        if (!ws)
          continue;

        ws.send(JSON.stringify({
          event: 'data',
          data: data,
        }));
      }
    }
  }, 1000);
}

module.exports = app;
