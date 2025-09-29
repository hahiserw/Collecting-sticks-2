var Entity = function(x, y, width, height) {
  this.x = x;
  this.y = y;

  this.width = width;
  this.height = height;
};

Entity.prototype.isCollidingWith = function(entity, margin) {
  if (!margin)
    margin = 0;

  return (this.x + this.width + margin >= entity.x
    && this.x <= entity.x + entity.width + margin
    && this.y + this.height + margin >= entity.y
    && this.y <= entity.y + entity.height + margin);
};

module.exports = Entity;
