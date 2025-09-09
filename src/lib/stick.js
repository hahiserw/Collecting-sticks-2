var c = require('../consts');
var Entity = require('./entity');

var Stick = function(model, x, y) {
  Entity.call(this, x, y, c.STICK_WIDTH, c.STICK_HEIGHT);

  this.model = model;
};

Stick.prototype.getData = function() {
  return {
    model: this.model,
    x: this.x,
    y: this.y,
  };
};

Object.setPrototypeOf(Stick.prototype, Entity.prototype);

module.exports = Stick;
