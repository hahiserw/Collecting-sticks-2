var Entity = function(x, y, width, height) {
  this.x = x;
  this.y = y;

  this.width = width;
  this.height = height;
};

Entity.prototype.isCollidingWith = function(entity) {
  return (this.x + this.width >= entity.x
    && this.x <= entity.x + entity.width
    && this.y + this.height >= entity.y
    && this.y <= entity.y + entity.height);
};

module.exports = Entity;
