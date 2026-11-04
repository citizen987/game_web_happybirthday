// Roll, downhill speed-up, crouch charge, jump ball and ball attacks.
// The waits here are physics windows (how long a key is held), so they stay as fixed durations.
import assert from 'node:assert/strict';
import { DESKTOP, assertNoErrors, openGame, startWithKeyboard } from '../lib/game.js';

export default async function roll({ browser, baseUrl }) {
  const g = await openGame(browser, baseUrl, { context: DESKTOP });
  const { page, ev, wait } = g;
  const k = page.keyboard;
  const player = () => ev(() => {
    const p = window.__dd.player;
    return { x: p.x, vx: +p.vx.toFixed(3), vy: p.vy, rolling: p.rolling, charging: p.charging, airBall: p.airBall, crouch: p.crouch, onGround: p.onGround, face: p.face };
  });
  try {
    await startWithKeyboard(page);

    // 1) Down while running curls into a roll; no acceleration while rolling.
    await ev(() => window.__dd.teleport(150));
    await k.down('ArrowRight'); await wait(1300);
    let s = await player();
    assert.ok(s.vx > 3, `running fast before rolling: ${s.vx}`);
    await k.down('ArrowDown'); await wait(80);
    const r0 = await player();
    assert.equal(r0.rolling, true, 'rolling after pressing down');
    await wait(300);
    const r1 = await player();
    assert.ok(r1.rolling && r1.vx < r0.vx, `no accel while rolling (${r0.vx} -> ${r1.vx})`);
    // Braking against the roll decelerates faster than friction, then stands up (crouched, down still held).
    await k.up('ArrowRight'); await k.down('ArrowLeft'); await wait(200);
    const r2 = await player();
    const brake = r1.vx - r2.vx;
    await k.up('ArrowLeft');
    await wait(1500);
    const r3 = await player();
    assert.ok(brake > 0.3 * 0.035 * 12 * 3, `braking is strong (${brake})`);
    assert.equal(r3.rolling, false, 'uncurls when slow');
    assert.equal(r3.crouch, true, 'crouches while down still held');
    await k.up('ArrowDown'); await wait(100);

    // 2) Downhill: rolling gains speed.
    await ev(() => { const d = window.__dd; d.teleport(790); d.player.vx = 1.5; d.player.rolling = true; });
    await wait(500);
    s = await player();
    assert.ok(s.vx > 1.5 && s.rolling, `gains speed rolling downhill (${s.vx})`);
    await wait(1500);

    // 3) Crouch + jump charges instead of jumping; releasing down launches.
    await ev(() => window.__dd.teleport(150));
    await wait(200);
    await k.down('ArrowDown'); await wait(80);
    await k.press('Space'); await wait(60);
    s = await player();
    assert.equal(s.charging, true, 'charging');
    assert.equal(s.onGround, true, 'did not jump');
    await k.press('Space'); await wait(60); await k.press('Space'); await wait(60);
    await k.up('ArrowDown'); await wait(40);
    s = await player();
    assert.ok(s.rolling && s.vx >= 4.8 && s.vx <= 7.2 && s.face === 1, `launch speed in range: ${JSON.stringify(s)}`);
    await wait(1200);

    // 4) Every jump is a ball; uncurls on landing.
    await ev(() => window.__dd.teleport(150));
    await wait(200);
    await k.press('Space'); await wait(120);
    assert.equal((await player()).airBall, true, 'jump is a ball');
    await wait(1000);
    s = await player();
    assert.equal(s.airBall, false, 'uncurls on landing');
    assert.equal(s.onGround, true);

    // 5) Rolling into a crab destroys it with no damage.
    const crab = await ev(() => { const e = window.__dd.world.enemies.find((x) => x.type === 'crab'); return { min: e.min, max: e.max }; });
    await ev((c) => {
      const d = window.__dd;
      d.teleport(c.min - 120);
      const e = d.world.enemies.find((x) => x.type === 'crab');
      e.x = c.min + 20; e.dir = -1;
      d.world.coinCount = 0; d.player.inv = 0;
    }, crab);
    await k.down('ArrowDown'); await k.press('Space'); await wait(40); await k.press('Space'); await wait(40); await k.up('ArrowDown');
    await wait(900);
    s = await ev(() => ({ crabAlive: window.__dd.world.enemies.find((x) => x.type === 'crab').alive, lives: window.__dd.lives, dying: window.__dd.player.dying, hurt: window.__dd.player.hurt }));
    assert.deepEqual(s, { crabAlive: false, lives: 3, dying: false, hurt: false }, 'roll attack');

    // 6) Jump ball hitting a bee from the side/below destroys it.
    await ev(() => {
      const d = window.__dd;
      const bee = d.world.enemies.find((x) => x.type === 'bee' && x.alive);
      d.teleport(bee.x - 2);
      const p = d.player;
      p.onGround = false; p.airBall = true; p.y = bee.y + 14; p.vy = -3; p.inv = 0;
      d.world.coinCount = 0;
    });
    await wait(150);
    s = await ev(() => ({ beeAlive: window.__dd.world.enemies.filter((x) => x.type === 'bee')[0].alive, lives: window.__dd.lives, dying: window.__dd.player.dying }));
    assert.deepEqual(s, { beeAlive: false, lives: 3, dying: false }, 'jump attack');

    // 7) Walking (not a ball) into a crab still hurts as before.
    await ev(() => {
      const d = window.__dd;
      const e = d.world.enemies.find((x) => x.type === 'crab' && x.alive);
      d.world.coinCount = 4; d.player.inv = 0; d.teleport(e.x);
    });
    await wait(100);
    s = await ev(() => ({ coins: window.__dd.coins, lost: window.__dd.world.lostCoins.length, lives: window.__dd.lives }));
    assert.equal(s.coins, 0, 'walk hit drops coins');
    assert.ok(s.lost >= 4, 'walk hit scatters coins');
    assert.equal(s.lives, 3);

    assertNoErrors(g.errors);
  } finally {
    await g.close();
  }
}
