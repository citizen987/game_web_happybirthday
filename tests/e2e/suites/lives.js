// Hits with/without coins, falls, game over without score and retry.
import assert from 'node:assert/strict';
import {
  PHONE_LANDSCAPE, assertNoErrors, assertPng, mockNativeShare, openGame, readShareFileBytes,
  waitForEndPanel, waitForState,
} from '../lib/game.js';

export default async function lives({ browser, baseUrl }) {
  const g = await openGame(browser, baseUrl, { context: PHONE_LANDSCAPE, initScript: mockNativeShare });
  const { page, ev, frames } = g;
  try {
    await ev(() => localStorage.removeItem('dd-best'));
    await page.touchscreen.tap(422, 195);
    await waitForState(page, 'play');
    assert.equal(await ev(() => window.__dd.lives), 3, 'starts with 3 lives');

    const hitCrab = () => ev(() => {
      const d = window.__dd;
      const crab = d.world.enemies.find((e) => e.type === 'crab' && e.alive);
      d.teleport(crab.x);
    });
    const fall = () => ev(() => {
      const p = window.__dd.player;
      p.onGround = false;
      p.onPlat = null;
      p.y = 300;
    });

    // 1) Hit with coins: coins scatter, lives kept.
    await ev(() => { window.__dd.world.coinCount = 5; });
    await hitCrab();
    await frames(5);
    let s = await ev(() => ({ lives: window.__dd.lives, coins: window.__dd.coins, lost: window.__dd.world.lostCoins.length, dying: window.__dd.player.dying }));
    assert.equal(s.lives, 3, 'hit with coins keeps lives');
    assert.equal(s.coins, 0, 'hit with coins drops them');
    assert.ok(s.lost > 0, 'dropped coins scatter');
    assert.equal(s.dying, false);

    // 2) Hit without coins: dying animation, then -1 life and respawn at the checkpoint (start).
    await ev(() => {
      const d = window.__dd;
      d.world.lostCoins.length = 0;
      d.world.coinCount = 0;
      d.player.inv = 0;
      d.player.hurt = false;
    });
    await hitCrab();
    await frames(3);
    assert.equal(await ev(() => window.__dd.player.dying), true, 'dying after hit without coins');
    await page.waitForFunction(() => window.__dd.lives === 2 && !window.__dd.player.dying, null, { timeout: 5000 });
    s = await ev(() => ({ lives: window.__dd.lives, x: Math.round(window.__dd.player.x), dying: window.__dd.player.dying, state: window.__dd.state }));
    assert.deepEqual(s, { lives: 2, x: 60, dying: false, state: 'play' }, 'respawn at checkpoint with one life less');

    // 3) Fall into the void: -1 life, coins kept.
    await ev(() => { window.__dd.world.coinCount = 7; });
    await fall();
    await frames(3);
    s = await ev(() => ({ lives: window.__dd.lives, coins: window.__dd.coins, state: window.__dd.state }));
    assert.deepEqual(s, { lives: 1, coins: 7, state: 'play' }, 'fall costs a life and keeps coins');

    // 4) Last life: game over overlay without score, no record saved, share without points.
    await fall();
    await frames(3);
    assert.equal(await ev(() => window.__dd.state), 'gameover');
    await waitForEndPanel(page);
    const ui = await ev(() => ({
      mode: document.getElementById('win').dataset.mode,
      statsVisible: getComputedStyle(document.querySelector('.stats')).display !== 'none',
      subtitle: document.getElementById('end-subtitle').textContent,
      again: document.getElementById('again').textContent,
      best: localStorage.getItem('dd-best'),
      result: window.__dd.result,
      touchHidden: getComputedStyle(document.getElementById('touch')).display === 'none',
    }));
    assert.equal(ui.mode, 'gameover');
    assert.equal(ui.statsVisible, false, 'no score on game over');
    assert.equal(ui.again, 'Intentar de nuevo');
    assert.equal(ui.best, null, 'no record saved');
    assert.equal(ui.result, null);
    assert.ok(ui.subtitle.includes('sin vidas'), `subtitle: ${ui.subtitle}`);
    assert.ok(ui.touchHidden, 'touch controls hidden on the end screen');
    assertPng(await readShareFileBytes(page));

    await page.tap('#share');
    await page.waitForFunction(() => window.__shared !== null, null, { timeout: 3000 });
    const shared = await ev(() => window.__shared);
    assert.ok(!/puntos/.test(shared.text), 'game over share has no points');
    assert.ok(shared.text.includes('¡Feliz cumpleaños, David!'));
    assert.equal(shared.files.length, 1);

    // 5) Retry: fresh run.
    await page.tap('#again');
    await waitForState(page, 'play');
    s = await ev(() => ({ state: window.__dd.state, lives: window.__dd.lives, coins: window.__dd.coins, x: Math.round(window.__dd.player.x) }));
    assert.deepEqual(s, { state: 'play', lives: 3, coins: 0, x: 60 }, 'retry restores 3 lives');

    assertNoErrors(g.errors);
  } finally {
    await g.close();
  }
}
