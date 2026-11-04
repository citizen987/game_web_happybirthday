// Central tuning values. Physics values are per fixed 60 Hz step, in internal pixels.

export const TIMESTEP = 1 / 60;

export const VIEW = {
  HEIGHT: 180,
  MIN_WIDTH: 240,
  MAX_WIDTH: 400,
};

export const PHYSICS = {
  ACC: 0.09,
  DECEL: 0.35,
  FRIC: 0.07,
  CROUCH_FRIC: 0.1,
  TOP: 3.6,
  MAX_V: 6,
  AIR_ACC: 0.1,
  GRAV: 0.21,
  JUMP_V: -5.0,
  JUMP_CUT: -2.2,
  MAX_FALL: 6,
  SLOPE_G: 0.12,
  STEP_UP: 10,
  SNAP: 10,
  COYOTE_FRAMES: 7,
  JUMP_BUFFER_FRAMES: 7,
  STOMP_BOUNCE: -4.6,
};

export const PLAYER = {
  HALF_W: 5,
  H_STAND: 26,
  H_CROUCH: 16,
  HURT_INVULN: 120,
  RESPAWN_INVULN: 60,
  MAX_SPILL: 24,
};

export const WORLD = {
  START_X: 60,
  START_Y: 150,
  DEATH_Y: 250,
  WATER_Y: 182,
};

export const CAMERA = {
  MIN_Y: -60,
  MAX_Y: 18,
  OFFSET_Y: 122,
  LEAD: 0.42,
  LOOKAHEAD: 14,
  LERP_X: 0.12,
  LERP_Y: 0.08,
};

export const WIN = {
  SHOW_OVERLAY_AT: 80,
  FIREWORK_EVERY: 28,
  JOY_JUMP_V: -4.3,
  MAX_CONFETTI: 220,
  MESSAGE: '¡FELICIDADES, DAVID!',
};

export const ASSETS = {
  HEAD: 'assets/head.png',
};

// Opaque bounding box of assets/head.png and anchor points inside the scaled sprite.
export const HEAD_SPRITE = {
  SRC: { x: 0, y: 18, w: 256, h: 220 },
  INNER_W: 28,
  FACE_X: 22,
  CHIN_Y: 21,
};
