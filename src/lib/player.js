var c = require('../consts');
var Entity = require('./entity');

var Player = function(model, x, y) {
  Entity.call(this, x, y, c.PLAYER_WIDTH, c.PLAYER_HEIGHT);

  this.model = model;
  this.points = 0;
  this.message = '';

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

Object.setPrototypeOf(Player.prototype, Entity.prototype);

module.exports = Player;
