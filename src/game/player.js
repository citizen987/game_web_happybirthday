import { PHYSICS as P, PLAYER } from '../config.js';
import { approach, clamp } from '../utils/math.js';

const HW = PLAYER.HALF_W;

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
    coyote: 0,
    jumpBuf: 0,
    hurt: false,
    inv: 0,
    runT: 0,
    prevY: 0,
    vyPre: 0,
  };
}

export const playerTop = (p) => p.y - (p.crouch ? PLAYER.H_CROUCH : PLAYER.H_STAND);

/**
 * One physics step. `mode` is the game state: input only applies in 'play';
 * in 'win' the player decelerates and is driven by Game.
 */
export function updatePlayer(world, input, jumpPressed, mode) {
  const p = world.player;
  const terrain = world.terrain;
  const ctrl = mode === 'play' && !p.hurt;
  const L = ctrl && input.left;
  const R = ctrl && input.right;
  const D = ctrl && input.down;
  const J = ctrl && input.jump;
  const ix = (R ? 1 : 0) - (L ? 1 : 0);

  if (ctrl && jumpPressed) p.jumpBuf = P.JUMP_BUFFER_FRAMES;
  else if (p.jumpBuf > 0) p.jumpBuf--;
  p.coyote = p.onGround ? P.COYOTE_FRAMES : Math.max(0, p.coyote - 1);
  p.crouch = p.onGround && D;

  applyHorizontalForces(p, ix);
  if (mode === 'win') p.vx *= 0.9;
  p.vx = clamp(p.vx, -P.MAX_V, P.MAX_V);
  if (ix !== 0) p.face = ix;

  if (p.jumpBuf > 0 && p.coyote > 0) {
    p.vy = P.JUMP_V;
    p.onGround = false;
    p.onPlat = null;
    p.coyote = 0;
    p.jumpBuf = 0;
    p.crouch = false;
    world.events.push('jump');
  }

  moveHorizontally(p, terrain);
  followSupport(p, terrain);
  applyGravityAndLand(p, terrain, world.platforms, ctrl && !J);

  if (p.onGround && Math.abs(p.vx) > 0.1) p.runT += 0.12 + Math.abs(p.vx) * 0.09;
  if (p.inv > 0) p.inv--;
}

function applyHorizontalForces(p, ix) {
  if (p.onGround) {
    p.vx += p.slope * P.SLOPE_G;
    if (p.crouch) p.vx = approach(p.vx, 0, P.CROUCH_FRIC);
    else if (ix !== 0) {
      if (ix * p.vx < 0) p.vx += ix * P.DECEL;
      else if (Math.abs(p.vx) < P.TOP) p.vx = ix * Math.min(Math.abs(p.vx) + P.ACC, P.TOP);
      else p.vx = approach(p.vx, ix * P.TOP, 0.02);
    } else p.vx = approach(p.vx, 0, P.FRIC);
  } else if (ix !== 0 && ix * p.vx < P.TOP) {
    p.vx = ix * Math.min(ix * p.vx + P.AIR_ACC, P.TOP);
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
    if (p.hurt) {
      p.hurt = false;
      p.vx *= 0.3;
    }
  } else {
    p.y = ny;
  }
}
