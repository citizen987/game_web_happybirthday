import { PLAYER, WORLD } from '../config.js';
import { spawnParticles } from './effects.js';
import { playerHalfW, playerTop } from './player.js';

const LOST_COIN_LIFE = 200;
const LOST_COIN_GRACE = 25;

const touchesPlayer = (p, x, y) =>
  !p.dying && Math.abs(p.x - x) < playerHalfW(p) + 4 && y > playerTop(p) - 4 && y < p.y + 4;

function collectCoin(world, x, y) {
  world.coinCount++;
  spawnParticles(world, x, y, 5, ['#fff6c0', '#ffd23a'], 1.2, 0, 14);
  world.events.push('coin');
}

// Scatter n coins around the player; they can be picked up again for a while.
export function spillCoins(world, n) {
  const p = world.player;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i % 2 ? 1 : -1) * (0.3 + (i / n) * 1.1);
    const sp = 2.2 + (i % 3) * 0.6;
    world.lostCoins.push({ x: p.x, y: p.y - 14, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.5, age: 0 });
  }
}

/** Coins, spilled coins and checkpoints. Returns true when the player reached the flag. */
export function updatePickups(world) {
  const p = world.player;
  const terrain = world.terrain;

  for (const c of world.coins) {
    if (!c.taken && touchesPlayer(p, c.x, c.y)) {
      c.taken = true;
      collectCoin(world, c.x, c.y);
    }
  }

  const lost = world.lostCoins;
  for (let i = lost.length - 1; i >= 0; i--) {
    const c = lost[i];
    c.age++;
    c.vy += 0.18;
    c.x += c.vx;
    c.y += c.vy;
    const g = terrain.groundAt(c.x);
    if (g !== null && c.y > g - 4 && c.vy > 0 && c.y < g + 8) {
      c.y = g - 4;
      c.vy *= -0.6;
      c.vx *= 0.9;
    }
    if (c.age > LOST_COIN_LIFE || c.y > WORLD.DEATH_Y) {
      lost.splice(i, 1);
    } else if (c.age > LOST_COIN_GRACE && touchesPlayer(p, c.x, c.y)) {
      lost.splice(i, 1);
      collectCoin(world, c.x, c.y);
    }
  }

  for (const cp of world.checkpoints) {
    if (!cp.on && !p.dying && p.x >= cp.x) {
      cp.on = true;
      world.lastCheckpoint = cp;
      spawnParticles(world, cp.x, cp.y - 24, 14, ['#ffd23a', '#ff5a5a', '#ffffff'], 1.6, 0.03, 26);
      world.events.push('checkpoint');
    }
  }

  return !p.dying && p.x >= world.level.flagX - 6;
}
