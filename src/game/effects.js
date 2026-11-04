import { WIN } from '../config.js';
import { pick, rand } from '../utils/math.js';

const MAX_PARTICLES = 500;

const FIREWORK_PALETTES = [
  ['#ff5a5a', '#ffd23a', '#ffffff'],
  ['#5affb0', '#6ab8ff', '#ffffff'],
  ['#ff8af0', '#b07aff', '#ffffff'],
  ['#ffd23a', '#ff9a3a', '#fff6c0'],
];
const CONFETTI_COLORS = ['#ff5a5a', '#ffd23a', '#5affb0', '#6ab8ff', '#ff8af0', '#ffffff'];

export function spawnParticles(world, x, y, n, colors, speed, grav, life) {
  for (let i = 0; i < n; i++) {
    if (world.particles.length > MAX_PARTICLES) world.particles.shift();
    const a = Math.random() * Math.PI * 2;
    const sp = rand(speed * 0.4, speed);
    world.particles.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      g: grav,
      life: life + Math.floor(Math.random() * 20),
      c: pick(colors),
      s: Math.random() < 0.3 ? 2 : 1,
    });
  }
}

export function spawnFirework(world, x, y) {
  spawnParticles(world, x, y, 40, pick(FIREWORK_PALETTES), 2.4, 0.03, 55);
}

export function spawnConfetti(world, camX, camY, viewW) {
  if (world.confetti.length >= WIN.MAX_CONFETTI) return;
  for (let i = 0; i < 2; i++) {
    world.confetti.push({
      x: camX + Math.random() * viewW,
      y: camY - 4,
      vx: rand(-0.3, 0.3),
      vy: rand(0.5, 1.2),
      t: 0,
      ph: Math.random() * 6,
      c: pick(CONFETTI_COLORS),
    });
  }
}

export function updateEffects(world, camY, viewH) {
  const { particles, confetti } = world;
  for (let i = particles.length - 1; i >= 0; i--) {
    const q = particles[i];
    q.vy += q.g;
    q.x += q.vx;
    q.y += q.vy;
    q.vx *= 0.98;
    if (--q.life <= 0) particles.splice(i, 1);
  }
  for (let i = confetti.length - 1; i >= 0; i--) {
    const c = confetti[i];
    c.t++;
    c.y += c.vy;
    c.x += c.vx + Math.sin(c.t * 0.1 + c.ph) * 0.5;
    if (c.y > camY + viewH + 10) confetti.splice(i, 1);
  }
}
