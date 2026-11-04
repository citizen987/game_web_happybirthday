import { LIVES, WORLD } from '../config.js';
import { createPlayer } from './player.js';

/**
 * Mutable runtime state for one playthrough, created from static level data.
 * `events` is a queue of sound events (names or { name, arg }) drained by Game each step.
 */
export function createWorld(level) {
  const terrain = level.terrain;
  return {
    level,
    terrain,
    player: createPlayer(terrain, WORLD.START_X),
    coins: level.coins.map((c) => ({ x: c.x, y: c.y, taken: false })),
    enemies: level.enemies.map((e) => ({
      ...e,
      alive: true,
      dir: -1,
      t: Math.floor(Math.random() * 100),
      y: e.y0 || 0,
    })),
    platforms: level.platforms.map((p) => ({ ...p, x: p.x0, dx: 0 })),
    checkpoints: level.checkpoints.map((x) => ({ x, y: terrain.groundAt(x), on: false })),
    lastCheckpoint: { x: WORLD.START_X },
    coinCount: 0,
    lives: LIVES.START,
    lostCoins: [],
    particles: [],
    confetti: [],
    events: [],
    fade: 0,
    shake: 0,
  };
}

export function updatePlatforms(world, tick) {
  for (const pl of world.platforms) {
    if (!pl.range) {
      pl.dx = 0;
      continue;
    }
    const nx = pl.x0 + Math.sin(tick * pl.speed) * pl.range;
    pl.dx = nx - pl.x;
    pl.x = nx;
  }
}
