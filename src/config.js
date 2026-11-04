// Central tuning values. Physics values are per fixed 60 Hz step, in internal pixels.

export const TIMESTEP = 1 / 60;

export const VIEW = {
  HEIGHT: 180,
  WIDTH: 320, // fixed 16:9 (320x180); extra screen space becomes decorative bands
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

// Rolling ball, charge dash and ball jumps. Ratios follow the classic 16-bit
// rolling physics, rescaled ×0.6 to this game's slower speeds.
export const ROLL = {
  START_MIN: 0.6,          // min |vx| to curl into a roll when pressing down
  EXIT: 0.3,               // stand up below this |vx|
  FRIC: 0.035,             // half of walking friction: rolling keeps inertia
  DECEL: 0.075,            // braking when pressing against the roll
  SLOPE_DOWN: 2.5,         // × SLOPE_G when rolling downhill
  SLOPE_UP: 0.6,           // × SLOPE_G when rolling uphill
  MAX_V: 7.5,
  CHARGE_ADD: 2,           // per jump press while crouched
  CHARGE_MAX: 8,
  CHARGE_DECAY: 1 / 32,    // fraction of the charge lost per frame
  RELEASE_BASE: 4.8,       // release speed = BASE + floor(charge) * PER_CHARGE (4.8..7.2)
  RELEASE_PER_CHARGE: 0.3,
  // Ball ≈ 2/3 of the standing character's height (~34 px with the head).
  RADIUS: 11,
  H_BALL: 22,              // hitbox height (ball diameter minus 1 px)
  HALF_W_BALL: 9,          // hitbox half width for enemies/coins (terrain keeps PLAYER.HALF_W)
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
  LERP_X_FAST: 0.25,       // horizontal follow at top rolling speed
  MAX_LOOK: 70,
  LERP_Y: 0.08,
};

// Collectible letters spelling the birthday boy's name; all five transform the player.
export const LETTERS = {
  WORD: 'DAVID',
  POINTS: 1000,            // per letter
  WORD_BONUS: 5000,        // extra for completing the word
  NOTES: [72, 76, 79, 84, 88], // pickup chime climbs with each letter
};

// "Súper David": invincible to enemies (falls still cost a life), faster, golden hair + aura.
export const SUPER = {
  SPEED: 1.5,              // × running top speed and max speed
  ACC: 2,                  // × ground/air acceleration
  JUMP: 1.12,              // × jump impulse
  SEQUENCE_FRAMES: 70,     // freeze + flash while transforming
  BANNER: '¡SÚPER DAVID!',
  MUSIC_BPM: 176,
  MUSIC_TRANSPOSE: 12,
};

export const LIVES = {
  START: 3,
  DEATH_JUMP_V: -5,
  DEATH_FRAMES: 75,
  GAMEOVER_OVERLAY_AT: 70,
  GAMEOVER_SUBTITLE: 'Te has quedado sin vidas… ¡pero la felicitación llega igual! 🎂',
};

export const WIN = {
  SHOW_OVERLAY_AT: 80,
  FIREWORK_EVERY: 28,
  JOY_JUMP_V: -4.3,
  MAX_CONFETTI: 220,
  MESSAGE: '¡FELICIDADES, DAVID!',
};

// Points = coins * COIN_POINTS + max(0, PAR_SECONDS - whole seconds) * TIME_BONUS_PER_SECOND
export const SCORE = {
  COIN_POINTS: 100,
  PAR_SECONDS: 120,
  TIME_BONUS_PER_SECOND: 50,
  BEST_KEY: 'dd-best',
};

export const AUTHOR = {
  NAME: 'Rubén Codina',
  SHORT: 'Rubén',
};

export const SHARE = {
  URL: 'https://gamehappybirthday.netlify.app/',
  TITLE: '¡Feliz cumpleaños, David!',
  FILE_NAME: 'felicidades-david.png',
  CARD_SIZE: 1080,
};

export const ASSETS = {
  HEAD: 'assets/head.png',
};

// Opaque bounding box of assets/head.png and anchor points inside the scaled sprite.
export const HEAD_SPRITE = {
  SRC: { x: 0, y: 18, w: 256, h: 220 },
  INNER_W: 28,
  // HUD lives icon: cropped to the face only so it reads at ~13 px.
  ICON_SRC: { x: 116, y: 44, w: 140, h: 164 },
  HUD_ICON_W: 13,
  FACE_X: 22,
  CHIN_Y: 21,
};
