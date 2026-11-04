import { WORLD } from '../config.js';
import { mulberry32 } from '../utils/math.js';
import { rect } from './draw.js';

// Background layers. All functions take a view: { cx, cy, w, h, tick }.
// Screen-space layers scroll with a parallax factor of the camera.

const SKY_BANDS = ['#2a4fc4', '#3460d0', '#3f72dc', '#4b84e6', '#5a97ee', '#6aa9f4', '#7dbaf8', '#92caf9', '#a9d8fa', '#c2e6fb'];
const SKY_BAND_H = 13;
const CLOUD_SPAN = 680;

const CLOUDS = (() => {
  const r = mulberry32(3);
  const out = [];
  for (let i = 0; i < 9; i++) out.push({ x: i * 72 + r() * 30, y: 10 + r() * 50, w: 24 + Math.floor(r() * 26) });
  return out;
})();

const mountainHeight = (x) => 46 + 16 * Math.sin(x * 0.011) + 11 * Math.sin(x * 0.027 + 2) + 6 * Math.sin(x * 0.063 + 1);
const hillHeight = (x) => 22 + 10 * Math.sin(x * 0.021) + 6 * Math.sin(x * 0.05 + 1);

export function drawSky(ctx, v) {
  for (let i = 0; i < SKY_BANDS.length; i++) {
    rect(ctx, 0, i * SKY_BAND_H, v.w, i === SKY_BANDS.length - 1 ? v.h : SKY_BAND_H, SKY_BANDS[i]);
  }
}

export function drawClouds(ctx, v) {
  for (const c of CLOUDS) {
    const x = Math.round(((c.x - v.cx * 0.12 - v.tick * 0.08) % CLOUD_SPAN + CLOUD_SPAN) % CLOUD_SPAN) - 80;
    const { y, w } = c;
    rect(ctx, x + 4, y, w - 8, 4, '#ffffff');
    rect(ctx, x, y + 4, w, 6, '#ffffff');
    rect(ctx, x + 2, y + 10, w - 4, 2, '#d6ecff');
    rect(ctx, x + 8, y - 3, 10, 3, '#ffffff');
  }
}

export function drawMountains(ctx, v) {
  const base = Math.round(128 - v.cy * 0.15);
  for (let sx = 0; sx < v.w; sx++) {
    const wx = sx + v.cx * 0.2;
    const h = mountainHeight(wx);
    const top = Math.round(base - h);
    rect(ctx, sx, top, 1, v.h - top, mountainHeight(wx + 1) > h ? '#8798e0' : '#6576c4');
    if (h > 60) rect(ctx, sx, top, 1, 2 + Math.round((h - 60) * 0.4), '#e8eeff');
  }
}

export function drawHills(ctx, v) {
  const base = Math.round(146 - v.cy * 0.35);
  for (let sx = 0; sx < v.w; sx++) {
    const wx = sx + v.cx * 0.45;
    const h = hillHeight(wx);
    const top = Math.round(base - h);
    rect(ctx, sx, top, 1, v.h - top, hillHeight(wx + 1) > h ? '#3cb85c' : '#2a9a4a');
    rect(ctx, sx, top, 1, 1, '#6ad87a');
  }
}

// World-space layer (call inside the camera transform). Visible through gaps.
export function drawWater(ctx, v) {
  const wy = WORLD.WATER_Y;
  if (wy > v.cy + v.h) return;
  rect(ctx, v.cx, wy, v.w, v.cy + v.h - wy + 1, '#2b6fd6');
  rect(ctx, v.cx, wy + 6, v.w, v.cy + v.h - wy, '#235fc0');
  ctx.fillStyle = '#9fd4ff';
  const off = Math.floor(v.tick * 0.4);
  for (let x = v.cx; x < v.cx + v.w; x++) {
    if (((x + off) & 15) < 6) ctx.fillRect(x, wy, 1, 1);
    if (((x - off + 7) & 31) < 4) ctx.fillRect(x, wy + 3, 1, 1);
  }
}
