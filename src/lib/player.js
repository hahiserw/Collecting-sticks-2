var Player = function(model, x, y) {
  this.model = model;
  this.x = x;
  this.y = y;
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

module.exports = Player;
