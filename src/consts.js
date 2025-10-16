var consts = {
  FORM_ROOM_NAME_LENGTH: 50,
  FORM_SIMULTANEOUS_STICKS_MIN: 1,
  FORM_SIMULTANEOUS_STICKS_MAX: 10,
  FORM_MESSAGE_LENGTH: 50,

  TIME_DATA_BROADCAST: 100,
  TIME_CLIENT_DATA_BROADCAST: 100,
  TIME_STICK_GENERATE: 1000,
  TIME_MESSAGE_TIMEOUT: 4000,
  TIME_PLAYER_ANIMATION_NEXT_FRAME: 140,

  CANVAS_TEXT_COLOR: 'rgba(0, 0, 0, 0.8)',
  CANVAS_TEXT_BACKGROUND_COLOR: 'rgba(255, 255, 255, 0.8)',

  BOARD_WIDTH: 512,
  BOARD_HEIGHT: 384,
  PLAYER_WIDTH: 32,
  PLAYER_HEIGHT: 48,
  STICK_WIDTH: 32,
  STICK_HEIGHT: 32,

  // margin of collision between a player and a stick to get it
  STICK_MARGIN_COLLECT: -10,
  // margin between placing 2 sticks (or between a player and a stick)
  STICK_MARGIN_PLACE: 10,

  // allowed distance difference between 2 position updates
  // don't update player's position if they move more than this many pixels
  PLAYER_MOVE_STEP: 0,
};

consts.PLAYER_MOVE_STEP = consts.TIME_CLIENT_DATA_BROADCAST / 10; // px/s

module.exports = consts;
