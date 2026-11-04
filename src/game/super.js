import { SUPER } from '../config.js';
import { spawnParticles } from './effects.js';

// Súper David rules that live outside player physics: the transformation
// sequence and the sparkle trail. Physics multipliers are in player.js
// (motionLimits) and invincibility in enemies.js.

const SPARKS = ['#fff6a0', '#ffd23a', '#ffffff'];

// All five letters collected: flash and fanfare. Returns the freeze length in frames.
export function beginTransform(world) {
  world.transformPending = false;
  world.flash = 24;
  world.events.push('transform');
  return SUPER.SEQUENCE_FRAMES;
}

/**
 * One frame of the frozen transformation. `framesLeft` is the count after this
 * frame; at 0 the golden form becomes active. Returns true when it just finished.
 */
export function stepTransform(world, framesLeft) {
  const p = world.player;
  if (framesLeft % 3 === 0) spawnParticles(world, p.x, p.y - 16, 4, SPARKS, 2.2, 0, 22);
  if (world.flash > 0) world.flash--;
  if (framesLeft > 0) return false;
  world.super = true;
  p.super = true;
  world.flash = 12;
  return true;
}

// Golden sparkles left behind while Súper David moves.
export function superTrail(world, tick) {
  const p = world.player;
  if (!world.super || tick % 3 !== 0 || Math.abs(p.vx) <= 1) return;
  spawnParticles(world, p.x - Math.sign(p.vx) * 6, p.y - 14, 1, SPARKS, 0.4, -0.01, 16);
}
