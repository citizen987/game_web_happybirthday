// Integer-aligned solid rectangle: the only primitive used for pixel art.
export function rect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}
