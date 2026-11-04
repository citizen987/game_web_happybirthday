import { PHYSICS, PLAYER } from '../config.js';
import { spawnParticles } from './effects.js';
import { spillCoins } from './pickups.js';
import { killPlayer, playerTop } from './player.js';

const HW = PLAYER.HALF_W;

// Enemy hitboxes relative to (x, y): crabs stand on the ground, bees are centered.
function hitbox(e) {
  return e.type === 'crab'
    ? { half: 7, top: e.y - 11, bottom: e.y }
    : { half: 6, top: e.y - 5, bottom: e.y + 5 };
}

function moveEnemy(e, terrain) {
  e.t++;
  if (e.type === 'crab') {
    e.x += e.dir * 0.45;
    const g = terrain.groundAt(e.x);
    if (g !== null) e.y = g;
  } else {
    e.x += e.dir * 0.7;
    e.y = e.y0 + Math.sin(e.t * 0.07) * 7;
  }
  if (e.x < e.min) {
    e.x = e.min;
    e.dir = 1;
  } else if (e.x > e.max) {
    e.x = e.max;
    e.dir = -1;
  }
}

// Side hit: with coins, lose them (they scatter) plus knockback and 2 s of blinking
// invulnerability; with no coins, lose a life.
function hurtPlayer(world, srcX) {
  const p = world.player;
  if (p.inv > 0 || p.dying) return;
  if (world.coinCount === 0) {
    killPlayer(world);
    return;
  }
  spillCoins(world, Math.min(world.coinCount, PLAYER.MAX_SPILL));
  world.coinCount = 0;
  p.hurt = true;
  p.onGround = false;
  p.onPlat = null;
  p.crouch = false;
  p.vy = -3.6;
  p.vx = (p.x < srcX ? -1 : 1) * 2.2;
  p.inv = PLAYER.HURT_INVULN;
  world.shake = 8;
  world.events.push('hit');
}

/** Patrol enemies and resolve player contact (stomp from above, hurt otherwise). */
export function updateEnemies(world, canInteract) {
  const p = world.player;
  const pTop = playerTop(p);
  for (const e of world.enemies) {
    if (!e.alive) continue;
    moveEnemy(e, world.terrain);
    if (!canInteract) continue;

    const { half, top, bottom } = hitbox(e);
    const overlap = p.x + HW > e.x - half && p.x - HW < e.x + half && p.y > top && pTop < bottom;
    if (!overlap) continue;

    if (p.vyPre > 0.3 && p.prevY <= top + 6) {
      e.alive = false;
      spawnParticles(world, e.x, (top + bottom) / 2, 12, ['#ffffff', '#dfe6ff', '#ffd23a'], 1.8, 0.02, 20);
      p.vy = PHYSICS.STOMP_BOUNCE;
      p.onGround = false;
      p.onPlat = null;
      world.events.push('stomp');
    } else {
      hurtPlayer(world, e.x);
    }
  }
}
