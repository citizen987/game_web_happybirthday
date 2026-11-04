// Game feel: dust on hard landings and skids, camera shake on charge release.
import assert from 'node:assert/strict';
import { DESKTOP, assertNoErrors, openGame, startWithKeyboard } from '../lib/game.js';

export default async function feel({ browser, baseUrl }) {
  const g = await openGame(browser, baseUrl, { context: DESKTOP });
  const { page, ev, wait } = g;
  const k = page.keyboard;
  try {
    await startWithKeyboard(page);

    // Hard landing from high up kicks up dust.
    await ev(() => {
      const d = window.__dd;
      d.teleport(200);
      const p = d.player;
      p.onGround = false;
      p.y = 90;
      p.vy = 0;
      d.world.particles.length = 0;
    });
    await page.waitForFunction(() => window.__dd.player.onGround, null, { timeout: 3000 });
    const dust = await ev(() => window.__dd.world.particles.length);
    assert.ok(dust >= 6, `dust on hard landing (${dust})`);

    // Charge release shakes the camera.
    await wait(300);
    await k.down('ArrowDown');
    await k.press('Space');
    await wait(60);
    await k.up('ArrowDown');
    await wait(20);
    assert.ok(await ev(() => window.__dd.world.shake) > 0, 'release shakes the camera');

    // Reversing at speed kicks up skid dust.
    await wait(1500);
    await ev(() => {
      const d = window.__dd;
      d.teleport(150);
      d.player.vx = 3.5;
      d.world.particles.length = 0;
    });
    await k.down('ArrowLeft');
    await wait(150);
    await k.up('ArrowLeft');
    assert.ok(await ev(() => window.__dd.world.particles.length) > 0, 'dust when skidding');
    assertNoErrors(g.errors);
  } finally {
    await g.close();
  }
}
