var c = require('../consts');
var Entity = require('./entity');

var Player = function(model, x, y) {
  Entity.call(this, x, y, c.PLAYER_WIDTH, c.PLAYER_HEIGHT);

  this.model = model;
  this.points = 0;

  this.ws = null;
};

Player.prototype.getData = function() {
  return {
    model: this.model,
    x: this.x,
    y: this.y,
    points: this.points,
  };
};

Player.prototype.setWs = function(ws) {
  this.ws = ws;
};

Player.prototype.getWs = function() {
  return this.ws;
};

Object.setPrototypeOf(Player.prototype, Entity.prototype);

module.exports = Player;
