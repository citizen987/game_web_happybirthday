import { WORLD } from '../config.js';
import { mulberry32 } from '../utils/math.js';
import { Terrain } from './terrain.js';

const FLOWER_COLORS = ['#ff5a8a', '#ffd23a', '#ffffff', '#b07aff'];

/**
 * Builds the static level description. Runtime state (taken coins, live
 * enemies...) is created from this data by game/world.js.
 * Coordinates: x grows right, y grows down, ground baseline is y=150.
 */
export function buildLevel() {
  const t = new Terrain(WORLD.START_Y);
  const M = {};
  const mark = (key) => { M[key] = t.cursorX; };

  // --- Terrain (comment = resulting ground height) ---
  t.flat(440);
  mark('a'); t.ramp(140, -36);          // 114
  t.flat(200);
  mark('b'); t.ramp(180, 36);           // 150
  mark('c'); t.flat(320);
  mark('g1'); t.gap(72);
  mark('d'); t.flat(340);
  mark('e'); t.ramp(120, -30);          // 120
  t.flat(150);
  mark('g2'); t.gap(110);
  mark('f'); t.flat(260);
  mark('h'); t.ramp(220, 40);           // 160
  mark('i'); t.flat(440);
  t.ramp(120, -40);                     // 120
  mark('g3'); t.gap(100);
  mark('j'); t.flat(320);
  mark('k'); t.ramp(300, 30);           // 150
  mark('l'); t.flat(220);
  mark('g4'); t.gap(60);
  mark('m'); t.flat(120);
  mark('g5'); t.gap(60);
  mark('n'); t.flat(280);
  mark('o'); t.ramp(160, -50);          // 100
  mark('p'); t.flat(280);
  mark('q'); t.ramp(260, 60);           // 160
  mark('r'); t.flat(380);
  mark('g6'); t.gap(124, -10);          // 150
  mark('s'); t.flat(300);
  t.ramp(140, -30);                     // 120
  mark('t'); t.flat(220);
  t.ramp(140, 30);                      // 150
  mark('u'); t.flat(560);

  const level = {
    terrain: t,
    flagX: t.end - 70,
    coins: [],
    enemies: [],
    platforms: [],
    checkpoints: [],
    deco: [],
    letters: [],
  };

  // --- Placement helpers ---
  const coin = (x, y) => level.coins.push({ x: Math.round(x), y: Math.round(y) });
  const row = (x, n, dx = 20, h = 16) => {
    for (let i = 0; i < n; i++) {
      const g = t.groundAt(x + i * dx);
      if (g !== null) coin(x + i * dx, g - h);
    }
  };
  const arc = (x0, x1, n, baseY, peak) => {
    for (let i = 0; i < n; i++) {
      const k = i / (n - 1);
      coin(x0 + (x1 - x0) * k, baseY - peak * 4 * k * (1 - k));
    }
  };
  const plat = (x, y, w, range = 0, speed = 0) => {
    level.platforms.push({ x0: x, y, w, range, speed });
    return { x, y, w };
  };
  const crab = (min, max) => level.enemies.push({ type: 'crab', x: (min + max) / 2, min, max });
  const bee = (min, max, y0) => level.enemies.push({ type: 'bee', x: (min + max) / 2, min, max, y0 });

  // --- Coins ---
  row(100, 5);
  row(M.a + 10, 6, 22);
  row(M.a + 160, 6);
  row(M.b + 20, 7, 24);
  arc(M.g1 - 36, M.g1 + 108, 7, 134, 42);
  row(M.d + 40, 8);
  row(M.f + 40, 6, 22);
  row(M.h + 10, 8, 26);
  row(M.j + 30, 6, 24);
  row(M.k + 10, 10, 28);
  row(M.l + 30, 6, 22);
  arc(M.g4 - 20, M.g4 + 80, 5, 134, 30);
  arc(M.g5 - 20, M.g5 + 80, 5, 134, 30);
  row(M.n + 40, 8, 22);
  row(M.o + 10, 6, 26);
  row(M.p + 20, 4);
  row(M.q + 10, 9, 28);
  row(M.r + 40, 10, 30);
  row(M.s + 60, 8, 22);
  row(M.t + 20, 8, 24);
  row(M.u + 40, 14, 26);

  // --- Platforms (+ the coins that sit on them) ---
  const p1 = plat(M.g2 + 30, 100, 50);
  for (let i = 0; i < 3; i++) coin(p1.x + 11 + i * 14, p1.y - 14);
  [plat(M.i + 60, 130, 44), plat(M.i + 140, 104, 44), plat(M.i + 220, 78, 44)].forEach((pl) => {
    coin(pl.x + 15, pl.y - 12);
    coin(pl.x + 29, pl.y - 12);
  });
  for (let i = 0; i < 4; i++) coin(M.i + 226 + i * 11, 52);
  plat(M.g3 + 30, 112, 40, 30, 0.025);
  const p2 = plat(M.p + 110, 56, 60);
  for (let i = 0; i < 4; i++) coin(p2.x + 9 + i * 14, p2.y - 12);
  const p3 = plat(M.g6 + 10, 136, 36);
  const p4 = plat(M.g6 + 74, 124, 36);
  coin(p3.x + 20, p3.y - 14);
  coin(p4.x + 20, p4.y - 14);

  // --- Enemies ---
  crab(M.c + 40, M.c + 300);
  bee(M.d + 60, M.d + 300, 112);
  crab(M.f + 30, M.f + 240);
  crab(M.i + 20, M.i + 420);
  bee(M.i + 100, M.i + 380, 136);
  crab(M.j + 100, M.j + 200);
  crab(M.j + 210, M.j + 310);
  bee(M.l + 20, M.l + 200, 122);
  crab(M.n + 40, M.n + 260);
  crab(M.r + 20, M.r + 180);
  crab(M.r + 200, M.r + 370);
  bee(M.r + 60, M.r + 340, 124);
  crab(M.t + 20, M.t + 200);
  bee(M.u + 60, M.u + 240, 122);
  crab(M.u + 100, M.u + 380);
  bee(M.u + 260, M.u + 420, 110);

  // --- Letters D-A-V-I-D (slightly off the main path, always reachable with a normal jump) ---
  const letter = (x, y) => level.letters.push({ x: Math.round(x), y: Math.round(y) });
  letter(M.g1 + 36, 86);          // D: above the coin arc over the first gap
  letter(M.i + 242, 36);          // A: over the top stair platform
  letter(M.p + 140, 28);          // V: over the high platform
  letter(M.g3 + 50, 80);          // I: above the moving-platform gap
  letter(M.g6 + 60, 92);          // D: between the last gap's platforms

  // --- Checkpoints ---
  level.checkpoints.push(M.e + 140, M.i + 380, M.j + 40, M.l + 40, M.p + 30, M.s + 40);

  // --- Decoration (deterministic) ---
  const rng = mulberry32(7);
  let x = 80;
  while (x < t.end - 60) {
    x += 20 + rng() * 50;
    const g = t.groundAt(x);
    if (g === null || t.groundAt(x - 10) === null || t.groundAt(x + 10) === null) continue;
    const r = rng();
    const type = r < 0.35 ? 'flower' : r < 0.55 ? 'tuft' : r < 0.75 ? 'bush' : r < 0.88 ? 'rock' : 'palm';
    level.deco.push({
      x: Math.round(x),
      y: Math.round(g),
      type,
      c: FLOWER_COLORS[Math.floor(rng() * FLOWER_COLORS.length)],
    });
  }

  return level;
}
