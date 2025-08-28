var ws = require('ws');
var session = require('express-session');

var gameData = {
  players: {},
  items: [],
};

var initData = {
  files: {
    // TODO read from graphics folder
    players: [ "Remilia", "Remilia2", "Asuka", "FunkyPencil", "Milonar", "Wesker" ],
    backgrounds: [ "Grass" ],
    items: [ "Sticks" ],
  },
};

var sessionParser = session({
                            saveUninitialized: false,
                            secret: 'shhh',
                            resave: false,
});

var usedModels = [];

function anotherModel() {
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

var app = function(wss, eapp, server) {
  eapp.use(sessionParser);

  // server.on('upgrade', function(req, socket, head) {
  //   sessionParser(req, {}, function() {
  //     wss.handleUpgrade(req, socket, head, function(ws) {
  //       ws.emit('connection', ws, req);
  //     });
  //   });
  // });

  wss.on('connection', function(ws, req, client) {
    ws.on('error', console.error);

    console.log('ws request', req.url);
    // console.log('ws session', req.session);

    var model = anotherModel();
    // XXX var model = req.session.model;

    if (!model) {
      ws.terminate();
      return;
    }

    var data = {
      event: 'init',
      data: {
        files: initData.files,
        players: {},
      },
    };

    data.data.players[model] = {
      model: model,
      // x: 512 / 2 - 32 / 2,
      // y: 384 / 2 - 32 / 2 + 16,
      x: (512 - 32) * Math.random() | 0,
      y: (384 - 32 - 16) * Math.random() | 0,
      points: 0,
    };

    gameData.players[model] = data.data.players[model];

    console.log('join', model);
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
        // if (!gameData.players[model])
        //   gameData.players[model] = {};

        // XXX should get relative positions, not absolute, because an evil
        // player might teleport all over the place
        gameData.players[model].x = data.data.x;
        gameData.players[model].y = data.data.y;
        break;
      }
    });

    ws.on('close', function() {
      console.log('leave', model);

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

      delete gameData.players[model];
    });
  });

  setInterval(function() {
    wss.clients.forEach(function(client) {
      if (client.readyState !== ws.OPEN)
        return;

      client.send(JSON.stringify({
                                 event: 'data',
                                 data: gameData.players,
      }));
    });
  }, 1000);
}

module.exports = app;
