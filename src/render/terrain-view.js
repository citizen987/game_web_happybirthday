import { VIEW } from '../config.js';
import { rect } from './draw.js';

// World-space drawing of ground, platforms and decoration (inside the camera transform).

const NO_GROUND = -32768;
const groundTops = new Int16Array(VIEW.MAX_WIDTH + 1);

// 16x16 checkered dirt tile; patterns are anchored to world space via the transform.
export function createDirtPattern(ctx) {
  const c = document.createElement('canvas');
  c.width = 16;
  c.height = 16;
  const g = c.getContext('2d');
  g.fillStyle = '#b8682e'; g.fillRect(0, 0, 16, 16);
  g.fillStyle = '#9a5224'; g.fillRect(8, 0, 8, 8); g.fillRect(0, 8, 8, 8);
  g.fillStyle = '#d58a48'; g.fillRect(2, 2, 1, 1); g.fillRect(11, 12, 1, 1); g.fillRect(5, 13, 1, 1);
  g.fillStyle = '#7c3e18'; g.fillRect(12, 4, 1, 1); g.fillRect(3, 10, 1, 1);
  return ctx.createPattern(c, 'repeat');
}

// Ground is drawn one pixel column at a time so slopes stay crisp.
export function drawGround(ctx, v, terrain, dirt) {
  const bottom = v.cy + v.h;
  for (let sx = 0; sx < v.w; sx++) {
    const g = terrain.groundAt(v.cx + sx);
    groundTops[sx] = g === null ? NO_GROUND : Math.round(g);
  }
  ctx.fillStyle = dirt;
  for (let sx = 0; sx < v.w; sx++) {
    const g = groundTops[sx];
    if (g !== NO_GROUND && g + 4 < bottom) ctx.fillRect(v.cx + sx, g + 4, 1, bottom - g - 4);
  }
  for (let sx = 0; sx < v.w; sx++) {
    const g = groundTops[sx];
    if (g === NO_GROUND) continue;
    const wx = v.cx + sx;
    if (terrain.groundAt(wx - 1) === null || terrain.groundAt(wx + 1) === null) {
      rect(ctx, wx, g, 1, bottom - g, '#4a2a12');
      continue;
    }
    rect(ctx, wx, g, 1, 1, (wx % 6) < 4 ? '#a6f06a' : '#5ccc3e');
    rect(ctx, wx, g + 1, 1, 2, '#4cbc38');
    rect(ctx, wx, g + 3, 1, 1, '#2e8a2c');
    rect(ctx, wx, g + 4, 1, 1, '#5a3418');
    const m = wx % 7;
    if (m === 0 || m === 3) rect(ctx, wx, g - 1, 1, 1, '#5ccc3e');
  }
}

export function drawPlatforms(ctx, platforms, dirt) {
  for (const pl of platforms) {
    const x = Math.round(pl.x);
    const y = Math.round(pl.y);
    const w = pl.w;
    ctx.fillStyle = dirt;
    ctx.fillRect(x, y + 4, w, 6);
    rect(ctx, x, y, w, 1, '#a6f06a');
    rect(ctx, x, y + 1, w, 2, '#4cbc38');
    rect(ctx, x, y + 3, w, 1, '#2e8a2c');
    rect(ctx, x, y + 10, w, 1, '#4a2a12');
    rect(ctx, x, y + 3, 1, 7, '#5a3418');
    rect(ctx, x + w - 1, y + 3, 1, 7, '#5a3418');
    if (pl.range) {
      rect(ctx, x + 4, y + 11, w - 8, 1, '#4a2a12');
      rect(ctx, x + w / 2 - 1, y + 11, 2, 3, '#4a2a12');
    }
  }
}

const DECO_DRAWERS = {
  flower(ctx, d, tick) {
    const sway = Math.round(Math.sin(tick * 0.05 + d.x) * 0.8);
    rect(ctx, d.x, d.y - 5, 1, 5, '#2e8a2c');
    rect(ctx, d.x - 1 + sway, d.y - 8, 3, 3, d.c);
    rect(ctx, d.x + sway, d.y - 7, 1, 1, '#fff6a0');
  },
  tuft(ctx, { x, y }) {
    rect(ctx, x - 2, y - 3, 1, 3, '#2e8a2c');
    rect(ctx, x, y - 5, 1, 5, '#46b85a');
    rect(ctx, x + 2, y - 3, 1, 3, '#2e8a2c');
  },
  bush(ctx, { x, y }) {
    rect(ctx, x - 6, y - 5, 12, 5, '#2a8a3a');
    rect(ctx, x - 4, y - 8, 8, 3, '#2a8a3a');
    rect(ctx, x - 3, y - 7, 3, 1, '#46b85a');
    rect(ctx, x + 2, y - 4, 2, 1, '#46b85a');
  },
  rock(ctx, { x, y }) {
    rect(ctx, x - 3, y - 3, 6, 3, '#8a8aa0');
    rect(ctx, x - 2, y - 4, 4, 1, '#a8a8bd');
    rect(ctx, x + 1, y - 2, 2, 1, '#6a6a80');
  },
  palm(ctx, { x, y }, tick) {
    let tx = x;
    let ty = y;
    for (let i = 0; i < 10; i++) {
      tx = x + Math.round(Math.sin(i * 0.25) * 3);
      ty = y - 3 - i * 3;
      rect(ctx, tx - 1, ty, 3, 3, i % 2 ? '#8a5a2a' : '#a8703a');
    }
    const sway = Math.sin(tick * 0.03 + x) * 0.15;
    for (let a = 0; a < 6; a++) {
      const ang = -Math.PI + (a / 5) * Math.PI + sway;
      for (let k = 1; k < 9; k++) {
        const lx = Math.round(tx + Math.cos(ang) * k);
        const ly = Math.round(ty + Math.sin(ang) * k * 0.6 + k * k * 0.07);
        rect(ctx, lx, ly, 2, 2, k < 5 ? '#2fa84a' : '#45c25c');
      }
    }
    rect(ctx, tx - 1, ty + 2, 2, 2, '#6a3a1a');
    rect(ctx, tx + 2, ty + 2, 2, 2, '#6a3a1a');
  },
};

export function drawDeco(ctx, v, deco) {
  for (const d of deco) {
    if (d.x < v.cx - 30 || d.x > v.cx + v.w + 30) continue;
    DECO_DRAWERS[d.type](ctx, d, v.tick);
  }
}
