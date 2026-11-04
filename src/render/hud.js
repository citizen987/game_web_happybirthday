import { drawCoin } from './entities-view.js';

// 3x5 bitmap font, row-major, '1' = filled pixel.
const GLYPHS = {
  '0': '111101101101111', '1': '010110010010111', '2': '111001111100111',
  '3': '111001111001111', '4': '101101111001001', '5': '111100111001111',
  '6': '111100111101111', '7': '111001010010010', '8': '111101111101111',
  '9': '111101111001111', 'x': '000101010101000',
};

export function drawPixelText(ctx, text, x, y, scale, color) {
  ctx.fillStyle = color;
  for (let i = 0; i < text.length; i++) {
    const glyph = GLYPHS[text[i]];
    if (!glyph) continue;
    for (let k = 0; k < 15; k++) {
      if (glyph[k] === '1') {
        ctx.fillRect(x + i * 4 * scale + (k % 3) * scale, y + Math.floor(k / 3) * scale, scale, scale);
      }
    }
  }
}

function drawCounter(ctx, text, x, y) {
  drawPixelText(ctx, text, x + 1, y + 1, 2, '#1a1030');
  drawPixelText(ctx, text, x, y, 2, '#ffffff');
}

// Screen-space HUD, top-left: [David's face] x lives   [ring] x coins.
export function drawHud(ctx, { lives, coinCount, icon }) {
  if (icon) ctx.drawImage(icon, 4, 2);
  else {
    ctx.fillStyle = '#f3c39b';
    ctx.fillRect(4, 5, 12, 12);
  }
  drawCounter(ctx, `x${lives}`, 21, 7);
  const coinX = 21 + 4 * 2 * (1 + String(lives).length) + 10;
  drawCoin(ctx, coinX, 12, 1);
  drawCounter(ctx, `x${coinCount}`, coinX + 8, 7);
}
