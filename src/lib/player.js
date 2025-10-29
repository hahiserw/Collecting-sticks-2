var c = require('../consts');
var Entity = require('./entity');

var Player = function(model, x, y) {
  Entity.call(this, x, y, c.PLAYER_WIDTH, c.PLAYER_HEIGHT);

  this.model = model;
  this.points = 0;
  this.message = '';
  this.messageTimer = null;

  this.lastRequest = Date.now();

  this.ws = null;
};

Player.prototype.getData = function() {
  return {
    model: this.model,
    x: this.x,
    y: this.y,
    points: this.points,
    message: this.message,
  };
};

Player.prototype.setWs = function(ws) {
  this.ws = ws;
};

Player.prototype.getWs = function() {
  return this.ws;
};

Player.prototype.say = function(message) {
  this.message = message.substring(0, c.FORM_MESSAGE_LENGTH).trim();

  clearTimeout(this.messageTimer);

  this.messageTimer = setTimeout(function() {
    this.message = '';
  }.bind(this), c.TIME_MESSAGE_TIMEOUT);
};

Player.prototype.moveTo = function(x, y, teleport) {
  if (!teleport) {
    if (Math.abs(this.x - x) > c.PLAYER_MOVE_STEP
      || Math.abs(this.y - y) > c.PLAYER_MOVE_STEP)
      return;
  }

  this.x = x;
  this.y = y;
};

Player.prototype.teleport = function(x, y) {
  this.moveTo(x, y, true);
};

Object.setPrototypeOf(Player.prototype, Entity.prototype);

module.exports = Player;
