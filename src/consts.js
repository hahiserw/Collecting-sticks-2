var consts = {
  FORM_ROOM_NAME_LENGTH: 50,
  FORM_SIMULTANEOUS_STICKS_MIN: 1,
  FORM_SIMULTANEOUS_STICKS_MAX: 10,
  FORM_SIMULTANEOUS_STICKS_DEFAULT: 2,
  FORM_TIME_MIN: 0,
  FORM_TIME_MAX: 60,
  FORM_TIME_DEFAULT: 5,
  FORM_STICKS_MIN: 0,
  FORM_STICKS_MAX: 100,
  FORM_STICKS_DEFAULT: 20,
  // player chat
  FORM_MESSAGE_LENGTH: 50,

  // how often server should send broadcasts
  TIME_DATA_BROADCAST: 100,
  // how often client should send data
  TIME_CLIENT_DATA_BROADCAST: 100,
  // how often a new stick should be placed if there are none
  TIME_STICK_GENERATE: 1000,
  // how long should be a chat message displayed
  TIME_MESSAGE_TIMEOUT: 4000,
  // when to change the player's frame at client side
  TIME_PLAYER_ANIMATION_NEXT_FRAME: 140,

  // color of point counters and players' messages
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
  // don't update player's position if they move more than this many pixels per
  // request
  PLAYER_MOVE_STEP: 0,

  // allowed threshold at which player's request is accepted
  // it's multiplied by TIME_CLIENT_DATA_BROADCAST to get time difference
  // between current and last request
  // it's like antispam
  PLAYER_REQUEST_THRESHOLD: 0.75,
};

consts.PLAYER_MOVE_STEP = consts.TIME_CLIENT_DATA_BROADCAST / 10; // px/request

module.exports = consts;
