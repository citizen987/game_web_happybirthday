// Victory: the Happy Birthday song is scheduled after the goal and replay cuts it cleanly.
import assert from 'node:assert/strict';
import { DESKTOP, assertNoErrors, openGame, reachFlag, startWithKeyboard, waitForState } from '../lib/game.js';

// Counts oscillators created by the page so we can see the one-shot song being scheduled.
function countOscillators() {
  const Base = window.AudioContext;
  let created = 0;
  window.__oscillators = () => created;
  window.AudioContext = class extends Base {
    createOscillator() {
      created++;
      return super.createOscillator();
    }
  };
}

// Melody notes (25) + bass notes (8 bars x 3), each melody note uses 2 oscillators.
const MIN_SONG_OSCILLATORS = 25 * 2 + 8 * 3;

export default async function victorySong({ browser, baseUrl }) {
  const g = await openGame(browser, baseUrl, { context: DESKTOP, initScript: countOscillators });
  const { page, ev } = g;
  try {
    await startWithKeyboard(page);
    const before = await ev(() => window.__oscillators());
    await reachFlag(page);
    const scheduled = (await ev(() => window.__oscillators())) - before;
    assert.ok(scheduled >= MIN_SONG_OSCILLATORS, `birthday song scheduled (${scheduled} oscillators)`);

    await page.waitForFunction(() => window.__dd.result !== null && !document.getElementById('win').classList.contains('hidden'));
    await page.keyboard.press('Enter');
    await waitForState(page, 'play');
    assertNoErrors(g.errors);
  } finally {
    await g.close();
  }
}
