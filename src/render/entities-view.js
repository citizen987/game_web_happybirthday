import { rect } from './draw.js';

// World-space drawing of coins, enemies, checkpoints, goal flag and effects.

const RING_OUTER = 5;
const RING_INNER = 2.6;
const RING_RIM = '#b0700c';
const RING_GOLD = '#ffd23a';
const RING_SHINE = '#fff6c0';

// Spinning golden hoop: sx is the horizontal scale (0 = edge-on, 1 = facing camera).
// Drawn row by row as two gold spans around a transparent hole; edge-on it collapses to a bar.
export function drawCoin(ctx, cx, cy, sx) {
  for (let r = -RING_OUTER; r < RING_OUTER; r++) {
    const yy = r + 0.5;
    const ow = Math.max(1, Math.round(Math.sqrt(RING_OUTER * RING_OUTER - yy * yy) * 2 * sx));
    const x0 = cx - (ow >> 1);
    const inHole = yy * yy < RING_INNER * RING_INNER;
    const iw = inHole ? Math.round(Math.sqrt(RING_INNER * RING_INNER - yy * yy) * 2 * sx) : 0;
    const edgeRow = r === -RING_OUTER || r === RING_OUTER - 1;

    if (iw > 0 && ow - iw >= 2) {
      const h0 = cx - (iw >> 1);
      const h1 = h0 + iw;
      drawRingSpan(ctx, x0, h0, cy + r, edgeRow, true, false);
      drawRingSpan(ctx, h1, x0 + ow, cy + r, edgeRow, false, true);
    } else {
      drawRingSpan(ctx, x0, x0 + ow, cy + r, edgeRow, true, true);
    }
  }
  if (sx > 0.45) {
    const hx = cx - Math.round(sx * (RING_OUTER - 1));
    rect(ctx, hx, cy - 3, 1, 2, RING_SHINE);
  }
}

// One horizontal slice of the hoop: gold, with a dark rim pixel on the outer silhouette only
// (hole edges stay gold so the thin band keeps its color at 10 px).
function drawRingSpan(ctx, from, to, y, edgeRow, rimLeft, rimRight) {
  const w = to - from;
  if (w <= 0) return;
  if (edgeRow || w <= 2) {
    rect(ctx, from, y, w, 1, RING_RIM);
    return;
  }
  rect(ctx, from, y, w, 1, RING_GOLD);
  if (rimLeft) rect(ctx, from, y, 1, 1, RING_RIM);
  if (rimRight) rect(ctx, to - 1, y, 1, 1, RING_RIM);
}

export function drawCoins(ctx, v, coins, lostCoins) {
  for (const c of coins) {
    if (c.taken || c.x < v.cx - 10 || c.x > v.cx + v.w + 10) continue;
    drawCoin(ctx, c.x, c.y, Math.abs(Math.cos(v.tick * 0.07 + c.x * 0.05)));
  }
  for (const c of lostCoins) {
    if (c.age > 140 && (c.age >> 2) % 2) continue;
    drawCoin(ctx, Math.round(c.x), Math.round(c.y), Math.abs(Math.cos(v.tick * 0.2 + c.age)));
  }
}

function drawCrab(ctx, e, x, y) {
  const step = (e.t >> 3) % 2;
  for (let i = 0; i < 3; i++) {
    const o = (i + step) % 2;
    rect(ctx, x - 7 + i * 2, y - 3 + o, 1, 3 - o, '#7a1010');
    rect(ctx, x + 2 + i * 2, y - 3 + (1 - o), 1, 2 + o, '#7a1010');
  }
  rect(ctx, x - 7, y - 8, 14, 5, '#e8402e');
  rect(ctx, x - 6, y - 9, 12, 1, '#e8402e');
  rect(ctx, x - 4, y - 9, 6, 1, '#ff8a6a');
  rect(ctx, x - 6, y - 4, 12, 1, '#a81e14');
  rect(ctx, x - 3, y - 12, 1, 3, '#a81e14');
  rect(ctx, x + 2, y - 12, 1, 3, '#a81e14');
  rect(ctx, x - 4, y - 14, 2, 2, '#ffffff');
  rect(ctx, x + 2, y - 14, 2, 2, '#ffffff');
  const look = e.dir > 0 ? 1 : 0;
  rect(ctx, x - 4 + look, y - 13, 1, 1, '#000000');
  rect(ctx, x + 2 + look, y - 13, 1, 1, '#000000');
  const claw = (e.t >> 4) % 2;
  rect(ctx, x - 11, y - 11 + claw * 2, 4, 4, '#ff5a3a');
  rect(ctx, x - 11, y - 12 + claw * 2, 2, 1, '#ff5a3a');
  rect(ctx, x + 7, y - 9 - claw * 2, 4, 4, '#ff5a3a');
  rect(ctx, x + 9, y - 10 - claw * 2, 2, 1, '#ff5a3a');
}

function drawBee(ctx, e, x, y) {
  const f = e.dir;
  const B = (lx, ly, w, h, c) => rect(ctx, f > 0 ? x + lx : x - lx - w, y + ly, w, h, c);
  const flap = (e.t >> 2) % 2;
  B(-3, -7 + flap, 4, 3 - flap, 'rgba(235,248,255,0.9)');
  B(0, -8 + flap, 4, 3 - flap, 'rgba(235,248,255,0.9)');
  B(-5, -3, 10, 6, '#ffd23a');
  B(-2, -3, 2, 6, '#222233');
  B(1, -3, 1, 6, '#222233');
  B(4, -3, 3, 5, '#222233');
  B(5, -2, 1, 1, '#ffffff');
  B(-7, 0, 2, 1, '#222233');
  B(-4, -3, 1, 1, '#fff6a0');
}

export function drawEnemies(ctx, v, enemies) {
  for (const e of enemies) {
    if (!e.alive || e.x < v.cx - 20 || e.x > v.cx + v.w + 20) continue;
    const x = Math.round(e.x);
    const y = Math.round(e.y);
    if (e.type === 'crab') drawCrab(ctx, e, x, y);
    else drawBee(ctx, e, x, y);
  }
}

export function drawCheckpoints(ctx, v, checkpoints) {
  for (const cp of checkpoints) {
    const x = cp.x;
    const y = Math.round(cp.y);
    rect(ctx, x - 3, y - 2, 6, 2, '#5a5a70');
    rect(ctx, x - 1, y - 24, 2, 22, '#d8d8e8');
    rect(ctx, x, y - 24, 1, 22, '#a0a0b8');
    const c = cp.on ? ((v.tick >> 3) % 2 ? '#ff3b3b' : '#ffd23a') : '#3a5fe0';
    rect(ctx, x - 2, y - 28, 4, 4, c);
    rect(ctx, x - 1, y - 29, 2, 1, c);
    rect(ctx, x - 1, y - 27, 1, 1, '#ffffff');
  }
}

export function drawFlag(ctx, v, flagX, terrain) {
  const gy = Math.round(terrain.groundAt(flagX));
  rect(ctx, flagX - 4, gy - 2, 8, 2, '#6a6a80');
  rect(ctx, flagX - 1, gy - 54, 2, 52, '#e8e8f0');
  rect(ctx, flagX, gy - 54, 1, 52, '#b0b0c4');
  rect(ctx, flagX - 2, gy - 58, 4, 4, '#ffd23a');
  for (let i = 0; i < 22; i++) {
    const yo = Math.round(Math.sin(v.tick * 0.12 - i * 0.45) * 1.6 * (i / 21));
    for (let r = 0; r < 3; r++) {
      rect(ctx, flagX + 1 + i, gy - 52 + yo + r * 4, 1, 4, (((i >> 2) + r) & 1) ? '#ffffff' : '#222233');
    }
  }
}

export function drawEffects(ctx, particles, confetti) {
  for (const q of particles) {
    if (q.life < 8 && (q.life & 1)) continue;
    rect(ctx, Math.round(q.x), Math.round(q.y), q.s, q.s, q.c);
  }
  for (const c of confetti) {
    const w = ((c.t + Math.floor(c.ph * 10)) >> 3) % 2 ? 3 : 1;
    rect(ctx, Math.round(c.x), Math.round(c.y), w, 2, c.c);
  }
}
