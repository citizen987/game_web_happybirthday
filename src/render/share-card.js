import { AUTHOR, HEAD_SPRITE, SHARE } from '../config.js';
import { formatPoints, formatTime } from '../utils/format.js';
import { mulberry32 } from '../utils/math.js';

const TITLE_FONT = '"Arial Black", "Helvetica Neue", Arial, sans-serif';
const BODY_FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const SKY_BANDS = ['#2a4fc4', '#3460d0', '#3f72dc', '#4b84e6', '#5a97ee', '#6aa9f4', '#7dbaf8', '#92caf9', '#a9d8fa', '#c2e6fb'];
const CONFETTI = ['#ff5a5a', '#ffd23a', '#5affb0', '#6ab8ff', '#ff8af0', '#ffffff'];

/**
 * Renders a square congratulation card (David's face + score) and resolves to
 * a PNG File ready for navigator.share. Rejects if the canvas cannot be
 * exported (e.g. page opened via file://).
 */
export function createShareCard({ headImage, result, size = SHARE.CARD_SIZE }) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const u = size / 1080; // design unit: layout below is authored for 1080 px

  drawBackdrop(ctx, size, u);
  drawConfetti(ctx, size, u);
  drawFittedText(ctx, '¡FELICIDADES, DAVID!', size / 2, 150 * u, 104 * u, size * 0.9, {
    font: TITLE_FONT, fill: '#ffd23a', stroke: '#1d2b8f', strokeWidth: 18 * u,
  });
  if (headImage) drawHead(ctx, headImage, size, u);
  drawScoreBox(ctx, result, size, u);
  drawFittedText(ctx, `Un regalo de ${AUTHOR.NAME}`, size / 2, 1008 * u, 32 * u, size * 0.92, {
    font: BODY_FONT, weight: 800, fill: '#ffe9a8', stroke: 'rgba(29,43,143,0.85)', strokeWidth: 8 * u,
  });
  drawFittedText(ctx, 'Juega y felicítale en gamehappybirthday.netlify.app', size / 2, 1056 * u, 30 * u, size * 0.92, {
    font: BODY_FONT, weight: 700, fill: '#ffffff', stroke: 'rgba(29,43,143,0.85)', strokeWidth: 8 * u,
  });

  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => {
        if (blob) resolve(new File([blob], SHARE.FILE_NAME, { type: 'image/png' }));
        else reject(new Error('Share card export returned no data'));
      }, 'image/png');
    } catch (err) {
      reject(err);
    }
  });
}

function drawBackdrop(ctx, size, u) {
  const band = Math.ceil(size / SKY_BANDS.length);
  SKY_BANDS.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(0, i * band, size, band);
  });
  // Pixel ground strip with grass and checkered dirt, echoing the game.
  const groundY = Math.round(960 * u);
  const cell = Math.round(40 * u);
  for (let x = 0; x < size; x += cell) {
    for (let y = groundY; y < size; y += cell) {
      ctx.fillStyle = ((x + y) / cell) % 2 ? '#9a5224' : '#b8682e';
      ctx.fillRect(x, y, cell, cell);
    }
  }
  ctx.fillStyle = '#4cbc38';
  ctx.fillRect(0, groundY - 14 * u, size, 18 * u);
  ctx.fillStyle = '#a6f06a';
  ctx.fillRect(0, groundY - 14 * u, size, 5 * u);
}

function drawConfetti(ctx, size, u) {
  const rng = mulberry32(42);
  for (let i = 0; i < 140; i++) {
    ctx.fillStyle = CONFETTI[Math.floor(rng() * CONFETTI.length)];
    const w = (rng() < 0.5 ? 10 : 18) * u;
    ctx.fillRect(rng() * size, rng() * size * 0.85, w, 10 * u);
  }
}

function drawHead(ctx, img, size, u) {
  const { SRC } = HEAD_SPRITE;
  const h = 500 * u;
  const w = h * (SRC.w / SRC.h);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowOffsetY = 14 * u;
  ctx.drawImage(img, SRC.x, SRC.y, SRC.w, SRC.h, (size - w) / 2, 205 * u, w, h);
  ctx.restore();
}

// result === null (out of lives): the box carries a plain birthday wish instead of points.
function drawScoreBox(ctx, result, size, u) {
  const w = 760 * u;
  const h = 190 * u;
  const x = (size - w) / 2;
  const y = 735 * u;
  ctx.fillStyle = '#1d2b8f';
  roundRect(ctx, x, y + 10 * u, w, h, 34 * u);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.96)';
  roundRect(ctx, x, y, w, h, 34 * u);
  ctx.fill();

  const headline = result ? `${formatPoints(result.total)} PUNTOS` : '¡FELIZ CUMPLEAÑOS!';
  let detail = '¿Llegarás tú a la meta?';
  if (result) {
    detail = `${result.coins} monedas · ${formatTime(result.seconds)}`;
    if (result.wordComplete) detail += ' · ¡SÚPER DAVID!';
    else if (result.letterCount > 0) detail += ` · ${result.letterCount}/5 letras`;
  }
  drawFittedText(ctx, headline, size / 2, y + 95 * u, 86 * u, w * 0.9, {
    font: TITLE_FONT, fill: '#e8282e',
  });
  drawFittedText(ctx, detail, size / 2, y + 158 * u, 42 * u, w * 0.9, {
    font: BODY_FONT, weight: 700, fill: '#1d2b8f',
  });
}

// Centered text that shrinks to fit maxWidth, with optional outline.
function drawFittedText(ctx, text, cx, baseline, px, maxWidth, { font, weight = 900, fill, stroke, strokeWidth = 0 }) {
  let size = px;
  ctx.font = `${weight} ${size}px ${font}`;
  const width = ctx.measureText(text).width + strokeWidth;
  if (width > maxWidth) {
    size = Math.floor(size * (maxWidth / width));
    ctx.font = `${weight} ${size}px ${font}`;
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  if (stroke) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = stroke;
    ctx.strokeText(text, cx, baseline);
  }
  ctx.fillStyle = fill;
  ctx.fillText(text, cx, baseline);
}

// Manual rounded rect: CanvasRenderingContext2D.roundRect is missing on older Safari.
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
