import { LETTERS, SCORE } from '../config.js';
import { formatTime } from '../utils/format.js';
import { drawCoin } from './entities-view.js';
import { drawGlyph, GLYPH_W } from './letter-glyphs.js';

// 3x5 bitmap font, row-major, '1' = filled pixel.
const GLYPHS = {
  '0': '111101101101111', '1': '010110010010111', '2': '111001111100111',
  '3': '111001111001111', '4': '101101111001001', '5': '111100111001111',
  '6': '111100111101111', '7': '111001010010010', '8': '111101111101111',
  '9': '111101111001111', 'x': '000101010101000', ':': '000010000010000',
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

function drawCounter(ctx, text, x, y, color = '#ffffff') {
  drawPixelText(ctx, text, x + 1, y + 1, 2, '#1a1030');
  drawPixelText(ctx, text, x, y, 2, color);
}

const TIMER_SCALE = 2;
const TIMER_TEXT_W = 5 * 4 * TIMER_SCALE - TIMER_SCALE; // "MM:SS"
const CLOCK_SIZE = 9;
const TIMER_COLOR = '#ffffff';
const TIMER_COLOR_NO_BONUS = '#9aa6c8'; // past SCORE.PAR_SECONDS the time bonus is already 0

// 9x9 pixel clock icon with hands at "10 past".
function drawClock(ctx, x, y, color) {
  const rows = ['001111100', '010000010', '100010001', '100010001', '100011001', '100000001', '100000001', '010000010', '001111100'];
  ctx.fillStyle = '#1a1030';
  rows.forEach((row, ry) => { for (let rx = 0; rx < 9; rx++) if (row[rx] === '1') ctx.fillRect(x + rx + 1, y + ry + 1, 1, 1); });
  ctx.fillStyle = color;
  rows.forEach((row, ry) => { for (let rx = 0; rx < 9; rx++) if (row[rx] === '1') ctx.fillRect(x + rx, y + ry, 1, 1); });
}

/**
 * Box of the timer in internal pixels: right-aligned, left of `insetRight` (the part
 * of the canvas covered by the DOM pause/mute buttons on this screen).
 */
export function timerBox(viewW, insetRight) {
  const right = viewW - 4 - Math.ceil(insetRight);
  const w = CLOCK_SIZE + 3 + TIMER_TEXT_W;
  return { x: right - w, y: 6, w, h: 11 };
}

// Top-right MM:SS play time (the same time that scores); dims once the time bonus is gone.
function drawTimer(ctx, seconds, viewW, insetRight) {
  const box = timerBox(viewW, insetRight);
  const color = seconds >= SCORE.PAR_SECONDS ? TIMER_COLOR_NO_BONUS : TIMER_COLOR;
  drawClock(ctx, box.x, box.y, color);
  drawCounter(ctx, formatTime(seconds), box.x + CLOCK_SIZE + 3, 7, color);
}

const SLOT_STEP = GLYPH_W + 4;

// Top-center D A V I D: dim until collected, gold when taken, shimmering in super form.
function drawLetterSlots(ctx, letters, viewW, tick, superForm) {
  const word = LETTERS.WORD;
  const x0 = Math.round((viewW - word.length * SLOT_STEP + 4) / 2);
  for (let i = 0; i < word.length; i++) {
    const taken = letters[i] && letters[i].taken;
    const shimmer = superForm && ((tick >> 2) + i) % 5 === 0;
    const fill = taken ? (shimmer ? () => '#ffffff' : (row) => (row < 3 ? '#fff2a0' : '#ffc21a')) : () => '#6c78b0';
    drawGlyph(ctx, word[i], x0 + i * SLOT_STEP, 6, 1, fill, '#1a1030');
  }
}

// Screen-space HUD: [David's face] x lives   [ring] x coins (top-left), D A V I D (top-center),
// [clock] MM:SS (top-right).
export function drawHud(ctx, { lives, coinCount, icon, letters, viewW, tick, superForm, seconds, insetRight = 0 }) {
  drawLetterSlots(ctx, letters, viewW, tick, superForm);
  drawTimer(ctx, seconds, viewW, insetRight);
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
