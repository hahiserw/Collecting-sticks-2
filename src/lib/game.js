var c = require('../consts');
var u = require('./utils');

var Player = require('./player');
var Stick = require('./stick');

var Game = function(name, background, simultaneousSticks, roundTime, roundSticks) {
  this.name = name;
  this.background = background;
  this.players = {};
  this.sticks = [];

  this.simultaneousSticks = simultaneousSticks,
  this.roundTime = roundTime;
  this.roundSticks = roundSticks;
  this.usedModels = [];

  this.sticksLeft = 0;

  this.broadcastInterval = setInterval(function() {
    this.broadcastPlayersData();
  }.bind(this), c.TIME_DATA_BROADCAST);

  this.generateInterval = setInterval(function() {
    this.generateSticks();
  }.bind(this), c.TIME_STICK_GENERATE);

  this.timeStart = Date.now();
  this.timeEnd = Date.now() + this.roundTime * 60 * 1000;
};

Game.prototype.addPlayer = function(model) {
  this.players[model] = new Player(
    model,
    (c.BOARD_WIDTH - c.PLAYER_WIDTH) * Math.random() | 0,
    (c.BOARD_HEIGHT - c.PLAYER_HEIGHT) * Math.random() | 0,
  );
};

Game.prototype.getPlayer = function(model) {
  return this.players[model];
};

Game.prototype.deletePlayer = function(model) {
  delete this.players[model];
};

Game.prototype.isModelInPlayers = function(model) {
  return model in this.players;
};

Game.prototype.getAnotherAvailableModel = function(models) {
  var choices = [];
  models.forEach(function(c) {
    if (!(c in this.usedModels))
      choices.push(c);
  }.bind(this));

  if (choices.length) {
    var model = choices[choices.length * Math.random() | 0];
    this.usedModels.push(model);

    return model;
  }

  return null;
};

Game.prototype.updateSticks = function() {
  var mostPoints = 0;

  // check if player is colliding with a stick and if so, add points and
  // delete the stick
  var toDelete = [];
  for (var model in this.players) {
    var player = this.getPlayer(model);

    for (var i = 0; i < this.sticks.length; i++) {
      var stick = this.sticks[i];

      if (player.isCollidingWith(stick, c.STICK_MARGIN_COLLECT)) {
        player.points++;
        toDelete.push(i);
      }
    }

    if (mostPoints < player.points)
      mostPoints = player.points;
  }

  // create a new array without deleted elements
  var newSticks = [];
  for (var i = 0; i < this.sticks.length; i++) {
    if (toDelete.indexOf(i) === -1)
      newSticks.push(this.sticks[i]);
  }

  this.sticks = newSticks;

  this.sticksLeft = this.roundSticks - mostPoints;
};

// send room data to every player in the room
Game.prototype.broadcastPlayersData = function() {
  var data = {players: {}, sticks: [], time: null, sticksLeft: 0};

  for (var model in this.players) {
    data.players[model] = this.getPlayer(model).getData();
  }

  for (var i = 0; i < this.sticks.length; i++) {
    data.sticks[i] = this.sticks[i].getData();
  }

  data.time = this.timeEnd - Date.now();
  data.sticksLeft = this.sticksLeft;

  for (var model in this.players) {
    const ws = this.getPlayer(model).getWs();

    if (!ws)
      continue;

    u.sendData(ws, 'data', data);
  }
};

Game.prototype.generateSticks = function() {
  // time out or no sticks to collect
  if ((this.roundTime !== 0 && Date.now() >= this.timeEnd)
    || (this.roundSticks !== 0 && this.sticksLeft <= 0)) {
    // delete sticks
    this.sticks = [];

    return;
  }

  // for every missing stick
  for (var i = 0; i < this.simultaneousSticks - this.sticks.length; i++) {
    // generate position again if the stick is colliding with a player or
    // another stick
    var x, y, stick, again;
    do {
      again = false;
      x = Math.random() * (c.BOARD_WIDTH - c.STICK_WIDTH) | 0;
      y = Math.random() * (c.BOARD_HEIGHT - c.STICK_HEIGHT) | 0;
      newStick = new Stick(Math.random() * 2 | 0, x, y);

      for (var model in this.players) {
        const player = this.getPlayer(model);

        if (again)
          break;
        else
          again = newStick.isCollidingWith(player, c.STICK_MARGIN_PLACE);
      }

      for (var i = 0; i < this.sticks.length; i++) {
        const stick = this.sticks[i];

        if (again)
          break;
        else
          again = newStick.isCollidingWith(stick, c.STICK_MARGIN_PLACE);
      }
    } while(again);

    this.sticks.push(newStick);
  }
};

// destructor
Game.prototype.end = function() {
  clearInterval(this.broadcastInterval);
  clearInterval(this.generateInterval);
};

module.exports = Game;
