// 5x7 pixel glyphs for the collectible letters (only those in LETTERS.WORD are needed).
const GLYPHS = {
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
};

export const GLYPH_W = 5;
export const GLYPH_H = 7;

function eachPixel(ch, fn) {
  const rows = GLYPHS[ch];
  if (!rows) throw new Error(`No pixel glyph for letter "${ch}"`);
  rows.forEach((row, y) => {
    for (let x = 0; x < GLYPH_W; x++) if (row[x] === '1') fn(x, y);
  });
}

/**
 * Draws a letter with a 1px (scaled) dark outline. `fill(row)` returns the
 * colour for each glyph row, which allows vertical gold gradients.
 */
export function drawGlyph(ctx, ch, x, y, scale, fill, outline) {
  ctx.fillStyle = outline;
  eachPixel(ch, (gx, gy) => ctx.fillRect(x + gx * scale - 1, y + gy * scale - 1, scale + 2, scale + 2));
  eachPixel(ch, (gx, gy) => {
    ctx.fillStyle = fill(gy);
    ctx.fillRect(x + gx * scale, y + gy * scale, scale, scale);
  });
}
