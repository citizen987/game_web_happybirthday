// A bot that never dodges must finish the level (project rule), and Enter restarts afterwards.
import assert from 'node:assert/strict';
import { DESKTOP, assertNoErrors, openGame, startWithKeyboard, waitForEndPanel, waitForState } from '../lib/game.js';

const BOT_TIMEOUT_MS = 150000;

export default async function playthrough({ browser, baseUrl }) {
  const g = await openGame(browser, baseUrl, { context: DESKTOP });
  try {
    await startWithKeyboard(g.page);

    // Runs in the page for frame-accurate timing: hold right, jump when a gap is 10-26 px ahead.
    await g.ev(() => {
      const fire = (type, code) => window.dispatchEvent(new KeyboardEvent(type, { code }));
      fire('keydown', 'ArrowRight');
      let holding = 0;
      const timer = setInterval(() => {
        const d = window.__dd;
        const p = d.player;
        if (holding > 0) {
          holding--;
          if (holding === 0) fire('keyup', 'Space');
          return;
        }
        const gapAhead = [10, 18, 26].some((o) => d.groundAt(p.x + o) === null);
        if (p.onGround && gapAhead) {
          fire('keydown', 'Space');
          holding = 25;
        }
      }, 16);
      window.__stopBot = () => {
        clearInterval(timer);
        fire('keyup', 'Space');
        fire('keyup', 'ArrowRight');
      };
    });

    await g.page.waitForFunction(
      () => window.__dd.state === 'win' || window.__dd.state === 'gameover',
      null,
      { timeout: BOT_TIMEOUT_MS, polling: 500 },
    );
    await g.ev(() => window.__stopBot());
    const end = await g.ev(() => ({ state: window.__dd.state, x: Math.round(window.__dd.player.x), flagX: window.__dd.flagX }));
    assert.equal(end.state, 'win', `bot reaches the flag (ended at x=${end.x} of ${end.flagX})`);

    await waitForEndPanel(g.page);
    await g.page.keyboard.press('Enter');
    await waitForState(g.page, 'play');
    const restart = await g.ev(() => ({ coins: window.__dd.coins, lives: window.__dd.lives, x: Math.round(window.__dd.player.x) }));
    assert.deepEqual(restart, { coins: 0, lives: 3, x: 60 }, 'Enter restarts a fresh run');

    assertNoErrors(g.errors);
  } finally {
    await g.close();
  }
}
