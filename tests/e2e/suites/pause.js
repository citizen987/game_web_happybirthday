// Pause: button visibility, P/Esc toggle, frozen simulation, auto-pause on hidden tab, touch.
import assert from 'node:assert/strict';
import { DESKTOP, PHONE_LANDSCAPE, assertNoErrors, openGame, startWithKeyboard, waitForState } from '../lib/game.js';

const pauseDisplay = () => getComputedStyle(document.getElementById('pause')).display;

export default async function pause({ browser, baseUrl }) {
  const g = await openGame(browser, baseUrl, { context: DESKTOP });
  const { page, ev, wait } = g;
  try {
    assert.equal(await ev(pauseDisplay), 'none', 'pause button hidden on title');
    await startWithKeyboard(page);
    assert.equal(await ev(pauseDisplay), 'block', 'pause button visible while playing');

    await page.keyboard.down('ArrowRight');
    await wait(400);
    await page.keyboard.press('KeyP');
    await page.waitForFunction(() => window.__dd.paused);
    const x1 = await ev(() => window.__dd.player.x);
    await wait(500);
    const x2 = await ev(() => window.__dd.player.x);
    await page.keyboard.up('ArrowRight');
    assert.equal(x2, x1, 'simulation frozen while paused');
    assert.equal(await ev(() => !document.getElementById('pause-overlay').classList.contains('hidden')), true, 'overlay shown');

    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !window.__dd.paused);

    // Hiding the tab pauses; coming back keeps it paused until the player resumes.
    const setHidden = (hidden) => ev((h) => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => h });
      document.dispatchEvent(new Event('visibilitychange'));
    }, hidden);
    await setHidden(true);
    assert.equal(await ev(() => window.__dd.paused), true, 'auto-pause when hidden');
    await setHidden(false);
    assert.equal(await ev(() => window.__dd.paused), true, 'still paused when visible again');
    await page.click('#resume');
    await page.waitForFunction(() => !window.__dd.paused);
    assertNoErrors(g.errors);
  } finally {
    await g.close();
  }

  const m = await openGame(browser, baseUrl, { context: PHONE_LANDSCAPE });
  try {
    await m.page.touchscreen.tap(422, 195);
    await waitForState(m.page, 'play');
    await m.page.tap('#pause');
    await m.page.waitForFunction(() => window.__dd.paused);
    await m.page.tap('#resume');
    await m.page.waitForFunction(() => !window.__dd.paused);
    assertNoErrors(m.errors);
  } finally {
    await m.close();
  }
}
