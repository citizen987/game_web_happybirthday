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

// Screen-space coin counter (top-left).
export function drawHud(ctx, coinCount) {
  drawCoin(ctx, 12, 12, 1);
  const text = `x${coinCount}`;
  drawPixelText(ctx, text, 21, 8, 2, '#1a1030');
  drawPixelText(ctx, text, 20, 7, 2, '#ffffff');
}
