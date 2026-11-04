// Touch controls move the player in landscape; portrait shows the rotate notice and pauses the game.
import assert from 'node:assert/strict';
import { PHONE_LANDSCAPE, PHONE_PORTRAIT, assertNoErrors, openGame } from '../lib/game.js';

async function holdRightButton(g) {
  const { width, height } = g.page.viewportSize();
  await g.page.touchscreen.tap(width / 2, height / 2);
  await g.wait(300);
  const center = await g.ev(() => {
    const r = document.querySelector('[data-btn=right]').getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  });
  const x0 = await g.ev(() => window.__dd.player.x);
  // Synthetic pointer events on window, as the touch controls listen there.
  await g.ev(([x, y]) => window.dispatchEvent(new PointerEvent('pointerdown', {
    pointerId: 7, pointerType: 'touch', clientX: x, clientY: y, bubbles: true,
  })), center);
  await g.wait(1200);
  const x1 = await g.ev(() => window.__dd.player.x);
  const rotateVisible = await g.ev(() => getComputedStyle(document.getElementById('rotate')).display !== 'none');
  return { state: await g.ev(() => window.__dd.state), moved: Math.round(x1 - x0), rotateVisible };
}

export default async function mobile({ browser, baseUrl }) {
  const land = await openGame(browser, baseUrl, { context: PHONE_LANDSCAPE });
  try {
    const s = await holdRightButton(land);
    assert.equal(s.state, 'play', 'tap starts the game in landscape');
    assert.ok(s.moved > 50, `right button moves the player (moved ${s.moved})`);
    assert.equal(s.rotateVisible, false, 'no rotate notice in landscape');
    assertNoErrors(land.errors);
  } finally {
    await land.close();
  }

  const port = await openGame(browser, baseUrl, { context: PHONE_PORTRAIT });
  try {
    const s = await holdRightButton(port);
    assert.equal(s.rotateVisible, true, 'rotate notice shown in portrait');
    assert.equal(s.state, 'title', 'game does not start in portrait');
    assert.equal(s.moved, 0, 'player does not move in portrait');
    assertNoErrors(port.errors);
  } finally {
    await port.close();
  }
}
