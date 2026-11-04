// The five DAVID letters, the Súper David transformation and its powers, and the letter score.
import assert from 'node:assert/strict';
import {
  DESKTOP, assertNoErrors, mockNativeShare, openGame, reachFlag, startWithKeyboard, waitForEndPanel, waitForState,
} from '../lib/game.js';

export default async function letters({ browser, baseUrl }) {
  const g = await openGame(browser, baseUrl, { context: DESKTOP, initScript: mockNativeShare });
  const { page, ev, wait } = g;
  // Letters can sit over gaps: after grabbing one, go back to solid ground with teleport(150).
  const backToGround = () => ev(() => window.__dd.teleport(150));
  const grab = (i) => ev((i) => {
    const d = window.__dd;
    const l = d.world.letters[i];
    d.teleport(l.x);
    const p = d.player;
    p.onGround = false; p.y = l.y + 14; p.vy = 0;
  }, i);
  try {
    await startWithKeyboard(page);
    assert.equal(await ev(() => window.__dd.world.letters.length), 5);

    for (let i = 0; i < 4; i++) {
      await grab(i);
      await wait(120);
      const s = await ev(() => ({ taken: window.__dd.world.letters.filter((l) => l.taken).length, super: window.__dd.super, freeze: window.__dd.freeze }));
      assert.deepEqual(s, { taken: i + 1, super: false, freeze: 0 }, `letter ${i} does not transform`);
      await backToGround();
      await wait(300);
    }

    // 5th letter: freeze + banner, then the golden form.
    await grab(4);
    await wait(150);
    const t = await ev(() => ({ freeze: window.__dd.freeze, banner: !document.getElementById('banner').classList.contains('hidden'), text: document.getElementById('banner').textContent }));
    assert.ok(t.freeze > 0, 'transformation freezes the game');
    assert.ok(t.banner, 'banner shown');
    assert.equal(t.text, '¡SÚPER DAVID!');
    await page.waitForFunction(() => window.__dd.freeze === 0, null, { timeout: 5000 });
    await backToGround();
    await wait(200);
    assert.equal(await ev(() => window.__dd.super), true, 'super after the sequence');
    assert.equal(await ev(() => window.__dd.lives), 3, 'no life lost so far');

    // Faster than the normal top speed (3.6).
    await backToGround();
    await page.keyboard.down('ArrowRight'); await wait(1200);
    const vx = await ev(() => window.__dd.player.vx);
    await page.keyboard.up('ArrowRight');
    assert.ok(vx > 4.5, `super runs faster (vx ${vx.toFixed(2)})`);
    await wait(1500);

    // Invincible: walking into a crab kills it and nothing is lost.
    const crabIndex = await ev(() => {
      const d = window.__dd;
      const e = d.world.enemies.find((x) => x.type === 'crab' && x.alive);
      d.world.coinCount = 3; d.teleport(e.x);
      return d.world.enemies.indexOf(e);
    });
    await wait(150);
    let s = await ev((i) => ({ crab: window.__dd.world.enemies[i].alive, coins: window.__dd.coins, lives: window.__dd.lives, hurt: window.__dd.player.hurt, dying: window.__dd.player.dying }), crabIndex);
    assert.deepEqual(s, { crab: false, coins: 3, lives: 3, hurt: false, dying: false }, 'invincible against a crab');

    // Golden ball (smoke: charging while super raises no errors).
    await ev(() => window.__dd.teleport(200));
    await wait(200);
    await page.keyboard.down('ArrowDown'); await page.keyboard.press('Space'); await wait(150);
    await page.keyboard.up('ArrowDown'); await wait(1200);

    // Falls still cost a life, but the golden form stays.
    await ev(() => { const p = window.__dd.player; p.onGround = false; p.onPlat = null; p.y = 300; });
    await wait(150);
    s = await ev(() => ({ lives: window.__dd.lives, super: window.__dd.super, state: window.__dd.state }));
    assert.deepEqual(s, { lives: 2, super: true, state: 'play' }, 'fall in super');

    // Win: letter points in the result, the panel and the shared text.
    await reachFlag(page);
    await waitForEndPanel(page);
    const r = await ev(() => ({ result: window.__dd.result, on: document.querySelectorAll('#score-letters .letter.on').length }));
    assert.equal(r.result.letterCount, 5);
    assert.equal(r.result.letterPoints, 10000);
    assert.equal(r.on, 5, 'all letters lit on the panel');
    await page.click('#share');
    await page.waitForFunction(() => window.__shared !== null, null, { timeout: 3000 });
    assert.ok((await ev(() => window.__shared.text)).includes('Súper David'), 'share text mentions Súper David');

    // Restart resets letters and form.
    await page.click('#again');
    await waitForState(page, 'play');
    s = await ev(() => ({ super: window.__dd.super, taken: window.__dd.world.letters.filter((l) => l.taken).length, bannerHidden: document.getElementById('banner').classList.contains('hidden') }));
    assert.deepEqual(s, { super: false, taken: 0, bannerHidden: true }, 'restart resets letters and form');

    assertNoErrors(g.errors);
  } finally {
    await g.close();
  }
}
