// HUD timer: counts only during play, matches the scored time, and never sits under
// the DOM pause/mute buttons on any screen shape.
import assert from 'node:assert/strict';
import { DESKTOP, PHONE_LANDSCAPE, assertNoErrors, openGame, reachFlag, startWithKeyboard, waitForState } from '../lib/game.js';

const TABLET = { viewport: { width: 1024, height: 768 }, isMobile: true, hasTouch: true };
const DESKTOP_169 = { viewport: { width: 1280, height: 720 } };

// Timer box (internal px) converted to CSS px, plus the button rects.
function overlapReport() {
  const c = document.getElementById('game').getBoundingClientRect();
  const s = c.width / 320;
  const b = window.__dd.timerBox();
  const timer = { left: c.left + b.x * s, right: c.left + (b.x + b.w) * s, top: c.top + b.y * s, bottom: c.top + (b.y + b.h) * s };
  const hits = ['pause', 'mute'].filter((id) => {
    const r = document.getElementById(id).getBoundingClientRect();
    return r.width > 0 && r.left < timer.right && r.right > timer.left && r.top < timer.bottom && r.bottom > timer.top;
  });
  return { hits, insideCanvas: timer.left >= c.left && timer.right <= c.right };
}

export default async function timer({ browser, baseUrl }) {
  const g = await openGame(browser, baseUrl, { context: DESKTOP });
  const { page, ev, wait } = g;
  try {
    assert.equal(await ev(() => window.__dd.time), 0, 'no time on the title screen');
    await startWithKeyboard(page);
    await wait(1200);
    const t1 = await ev(() => window.__dd.time);
    assert.ok(t1 > 0.8, `time runs while playing (${t1})`);

    await page.keyboard.press('KeyP');
    await page.waitForFunction(() => window.__dd.paused);
    const p1 = await ev(() => window.__dd.time);
    await wait(500);
    assert.equal(await ev(() => window.__dd.time), p1, 'time stops while paused');
    await page.keyboard.press('KeyP');

    await reachFlag(page);
    const end = await ev(() => window.__dd.time);
    await wait(500);
    assert.equal(await ev(() => window.__dd.time), end, 'time frozen after the goal');
    const scored = await ev(() => window.__dd.result.seconds);
    assert.ok(Math.abs(scored - end) < 1 / 30, `HUD time equals scored time (${end} vs ${scored})`);
    await page.waitForFunction(() => !document.getElementById('win').classList.contains('hidden'));
    const shown = await ev(() => document.getElementById('score-time').textContent);
    assert.match(shown, /^\d\d:\d\d$/, `score panel uses MM:SS (${shown})`);
    assertNoErrors(g.errors);
  } finally {
    await g.close();
  }

  // Layout: the timer stays inside the canvas and clear of the pause/mute buttons.
  for (const [name, ctx] of [['desktop 16:9', DESKTOP_169], ['phone', PHONE_LANDSCAPE], ['tablet 4:3', TABLET]]) {
    const o = await openGame(browser, baseUrl, { context: ctx });
    try {
      if (ctx.hasTouch) await o.page.touchscreen.tap(ctx.viewport.width / 2, ctx.viewport.height / 2);
      else await o.page.keyboard.press('Enter');
      await waitForState(o.page, 'play');
      const r = await o.ev(overlapReport);
      assert.deepEqual(r.hits, [], `${name}: timer overlaps ${r.hits.join(', ')}`);
      assert.ok(r.insideCanvas, `${name}: timer inside the canvas`);
      assertNoErrors(o.errors);
    } finally {
      await o.close();
    }
  }
}
