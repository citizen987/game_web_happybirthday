import { LIVES, PHYSICS as P, PLAYER, ROLL, SUPER } from '../config.js';
import { approach, clamp } from '../utils/math.js';
import { spawnParticles } from './effects.js';

const HW = PLAYER.HALF_W;
const DUST = ['#e8e0d0', '#c8bca8', '#ffffff'];

export function createPlayer(terrain, x) {
  return {
    x,
    y: terrain.groundAt(x),
    vx: 0,
    vy: 0,
    face: 1,
    onGround: true,
    onPlat: null,
    slope: 0,
    crouch: false,
    rolling: false,   // ball on the ground
    charging: false,  // ball spinning in place, building a charge dash
    charge: 0,
    airBall: false,   // ball in the air (every jump)
    spin: 0,          // ball rotation, for rendering
    dustT: 0,
    coyote: 0,
    jumpBuf: 0,
    hurt: false,
    inv: 0,
    runT: 0,
    prevY: 0,
    vyPre: 0,
    dying: false,
    dieT: 0,
    super: false,     // mirrors world.super (golden form)
  };
}

export const isBall = (p) => p.rolling || p.charging || p.airBall;

// While curled into a ball the player destroys enemies on contact from any side.
export const isAttacking = (p) => isBall(p) && !p.hurt && !p.dying;

// Half width of the body hitbox against enemies and coins (wider while a ball).
export const playerHalfW = (p) => (isBall(p) ? ROLL.HALF_W_BALL : HW);

export function playerTop(p) {
  if (isBall(p)) return p.y - ROLL.H_BALL;
  return p.y - (p.crouch ? PLAYER.H_CROUCH : PLAYER.H_STAND);
}

export function clearBall(p) {
  p.rolling = false;
  p.charging = false;
  p.charge = 0;
  p.airBall = false;
}

// Lose-a-life animation: hop up, then fall through everything off screen.
export function killPlayer(world) {
  const p = world.player;
  clearBall(p);
  p.dying = true;
  p.dieT = 0;
  p.hurt = false;
  p.onGround = false;
  p.onPlat = null;
  p.crouch = false;
  p.vx = 0;
  p.vy = LIVES.DEATH_JUMP_V;
  world.shake = 8;
  world.events.push('die');
}

/**
 * One physics step. `mode` is the game state: input only applies in 'play';
 * in 'win' the player decelerates and is driven by Game.
 */
export function updatePlayer(world, input, jumpPressed, mode) {
  const p = world.player;
  const terrain = world.terrain;
  if (p.dying) {
    p.dieT++;
    p.prevY = p.y;
    p.vy = Math.min(p.vy + P.GRAV, P.MAX_FALL);
    p.vyPre = p.vy;
    p.y += p.vy;
    return;
  }
  const ctrl = mode === 'play' && !p.hurt;
  const L = ctrl && input.left;
  const R = ctrl && input.right;
  const D = ctrl && input.down;
  const J = ctrl && input.jump;
  const ix = (R ? 1 : 0) - (L ? 1 : 0);

  // A jump press while crouched/charging builds the charge dash instead of jumping.
  const jumpUsed = updateGroundBall(world, p, D, ctrl && jumpPressed);
  if (ctrl && jumpPressed && !jumpUsed) p.jumpBuf = P.JUMP_BUFFER_FRAMES;
  else if (p.jumpBuf > 0) p.jumpBuf--;
  p.coyote = p.onGround ? P.COYOTE_FRAMES : Math.max(0, p.coyote - 1);
  p.crouch = p.onGround && D && !p.rolling && !p.charging;

  p.super = world.super;
  const lim = motionLimits(p);
  applyHorizontalForces(p, ix, lim);
  if (mode === 'win') p.vx *= 0.9;
  p.vx = clamp(p.vx, -lim.maxV, lim.maxV);
  if (ix !== 0 && !p.rolling) p.face = ix;

  if (p.jumpBuf > 0 && p.coyote > 0) {
    p.vy = lim.jumpV;
    p.onGround = false;
    p.onPlat = null;
    p.coyote = 0;
    p.jumpBuf = 0;
    p.crouch = false;
    p.rolling = false;
    p.charging = false;
    p.airBall = true;
    world.events.push('jump');
  }

  moveHorizontally(p, terrain);
  followSupport(p, terrain);
  applyGravityAndLand(p, terrain, world.platforms, ctrl && !J);

  if (p.onGround && Math.abs(p.vx) > 0.1) p.runT += 0.12 + Math.abs(p.vx) * 0.09;
  if (p.charging) p.spin += 0.9 * p.face;
  else if (p.rolling) p.spin += p.vx * 0.22;
  else if (p.airBall) p.spin += 0.35 * (p.vx < 0 ? -1 : 1);
  if (p.inv > 0) p.inv--;
}

/**
 * Ground ball state machine: crouch -> charge -> release, and roll <-> stand.
 * Returns true when the jump press was consumed by the charge.
 */
function updateGroundBall(world, p, down, jumpPressed) {
  if (!p.onGround) return false;
  const speed = Math.abs(p.vx);

  if (p.charging) {
    if (down) {
      if (jumpPressed) addCharge(world, p);
      p.charge -= p.charge * ROLL.CHARGE_DECAY;
      if (++p.dustT % 4 === 0) {
        spawnParticles(world, p.x - p.face * (ROLL.RADIUS - 1), p.y - 2, 2, DUST, 0.8, -0.02, 12);
      }
      return jumpPressed;
    }
    // Down released: launch as a rolling ball in the facing direction.
    p.charging = false;
    p.rolling = true;
    p.vx = p.face * (ROLL.RELEASE_BASE + Math.floor(p.charge) * ROLL.RELEASE_PER_CHARGE);
    p.charge = 0;
    spawnParticles(world, p.x - p.face * (ROLL.RADIUS + 1), p.y - 4, 10, DUST, 1.6, 0, 16);
    world.events.push('release');
    return false;
  }

  if (p.rolling) {
    if (speed < ROLL.EXIT) p.rolling = false;
    return false;
  }

  if (down && speed >= ROLL.START_MIN) {
    p.rolling = true;
    world.events.push('roll');
    return false;
  }
  if (down && jumpPressed) {
    p.charging = true;
    p.charge = 0;
    addCharge(world, p);
    return true;
  }
  return false;
}

function addCharge(world, p) {
  p.charge = Math.min(ROLL.CHARGE_MAX, p.charge + ROLL.CHARGE_ADD);
  world.events.push({ name: 'charge', arg: p.charge / ROLL.CHARGE_MAX });
}

// Movement limits for this step: Súper David runs, accelerates and jumps harder.
function motionLimits(p) {
  const s = p.super;
  return {
    top: P.TOP * (s ? SUPER.SPEED : 1),
    acc: P.ACC * (s ? SUPER.ACC : 1),
    airAcc: P.AIR_ACC * (s ? SUPER.ACC : 1),
    maxV: (isBall(p) ? ROLL.MAX_V : P.MAX_V) * (s ? SUPER.SPEED : 1),
    jumpV: P.JUMP_V * (s ? SUPER.JUMP : 1),
  };
}

function applyHorizontalForces(p, ix, lim) {
  if (p.onGround) {
    if (p.charging) {
      p.vx = approach(p.vx, 0, P.CROUCH_FRIC * 2);
    } else if (p.rolling) {
      // No acceleration while rolling: only slopes, friction and braking.
      const downhill = Math.sign(p.slope) === Math.sign(p.vx);
      p.vx += p.slope * P.SLOPE_G * (downhill ? ROLL.SLOPE_DOWN : ROLL.SLOPE_UP);
      if (ix !== 0 && ix * p.vx < 0) p.vx = approach(p.vx, 0, ROLL.DECEL);
      p.vx = approach(p.vx, 0, ROLL.FRIC);
    } else {
      p.vx += p.slope * P.SLOPE_G;
      if (p.crouch) p.vx = approach(p.vx, 0, P.CROUCH_FRIC);
      else if (ix !== 0) {
        if (ix * p.vx < 0) p.vx += ix * P.DECEL;
        else if (Math.abs(p.vx) < lim.top) p.vx = ix * Math.min(Math.abs(p.vx) + lim.acc, lim.top);
        else p.vx = approach(p.vx, ix * lim.top, 0.02);
      } else p.vx = approach(p.vx, 0, P.FRIC);
    }
  } else if (ix !== 0 && ix * p.vx < lim.top) {
    p.vx = ix * Math.min(ix * p.vx + lim.airAcc, lim.top);
  }
}

// Move on x; ground rising more than STEP_UP above the feet acts as a wall.
function moveHorizontally(p, terrain) {
  p.prevY = p.y;
  if (p.onPlat) p.x += p.onPlat.dx;
  let nx = p.x + p.vx;
  if (p.vx !== 0) {
    const lead = terrain.groundAt(nx + Math.sign(p.vx) * HW);
    if (lead !== null && lead < p.y - P.STEP_UP) {
      nx = p.x;
      p.vx = 0;
    }
  }
  p.x = clamp(nx, HW, terrain.end - HW);
}

// While grounded, stick to the platform/ground below or start falling.
function followSupport(p, terrain) {
  if (!p.onGround) return;
  if (p.onPlat) {
    const pl = p.onPlat;
    if (p.x + HW < pl.x || p.x - HW > pl.x + pl.w) {
      p.onGround = false;
      p.onPlat = null;
    } else {
      p.y = pl.y;
      p.slope = 0;
    }
    return;
  }
  const g = terrain.groundAt(p.x);
  if (g !== null && g <= p.y + P.SNAP) {
    p.y = g;
    p.slope = terrain.slopeAt(p.x);
  } else {
    p.onGround = false;
    p.slope = 0;
  }
}

// Airborne step: variable jump cut, gravity, landing on ground or one-way platforms.
function applyGravityAndLand(p, terrain, platforms, cutJump) {
  p.vyPre = p.vy;
  if (p.onGround) return;
  if (cutJump && p.vy < P.JUMP_CUT) p.vy = P.JUMP_CUT;
  p.vy = Math.min(p.vy + P.GRAV, P.MAX_FALL);
  p.vyPre = p.vy;

  let ny = p.y + p.vy;
  let landY = null;
  let landPlat = null;
  const g = terrain.groundAt(p.x);
  if (g !== null && ny >= g && p.y <= g + P.STEP_UP) {
    if (p.vy >= 0) landY = g;
    else ny = g;
  }
  if (p.vy >= 0) {
    for (const pl of platforms) {
      const overlaps = p.x + HW > pl.x && p.x - HW < pl.x + pl.w;
      if (overlaps && p.y <= pl.y + 0.5 && ny >= pl.y && (landY === null || pl.y < landY)) {
        landY = pl.y;
        landPlat = pl;
      }
    }
  }
  if (landY !== null) {
    p.y = landY;
    p.vy = 0;
    p.onGround = true;
    p.onPlat = landPlat;
    p.slope = landPlat ? 0 : terrain.slopeAt(p.x);
    // Jump ball uncurls on landing (holding down re-curls it into a roll next step).
    p.airBall = false;
    if (p.hurt) {
      p.hurt = false;
      p.vx *= 0.3;
    }
  } else {
    p.y = ny;
  }
}
