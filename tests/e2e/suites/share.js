// Score panel, native share (mocked) on a phone and clipboard + download fallback on desktop.
import assert from 'node:assert/strict';
import {
  PHONE_LANDSCAPE, assertNoErrors, assertPng, mockNativeShare, openGame, reachFlag,
  readShareFileBytes, removeNativeShare, startWithKeyboard, waitForEndPanel, waitForState,
} from '../lib/game.js';

const SHARE_URL = 'https://gamehappybirthday.netlify.app/';
const formatPoints = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

async function nativeShareOnPhone(browser, baseUrl) {
  const g = await openGame(browser, baseUrl, { context: PHONE_LANDSCAPE, initScript: mockNativeShare });
  try {
    await startWithKeyboard(g.page);
    await reachFlag(g.page);
    await waitForEndPanel(g.page);

    const ui = await g.ev(() => ({
      result: window.__dd.result,
      coins: document.getElementById('score-coins').textContent,
      time: document.getElementById('score-time').textContent,
      total: document.getElementById('score-total').textContent,
      best: document.getElementById('score-best').textContent,
      label: document.getElementById('share').textContent,
      downloadHidden: document.getElementById('download').classList.contains('hidden'),
    }));
    const r = ui.result;
    assert.ok(r && r.total > 0, 'result with points');
    assert.equal(r.total, r.coinPoints + r.timeBonus + r.letterPoints, 'total adds up');
    assert.equal(ui.coins, `${r.coins}/${r.totalCoins}`);
    assert.match(ui.time, /^\d+:\d{2}$/);
    assert.equal(ui.total, formatPoints(r.total));
    assert.equal(ui.best, `Récord: ${formatPoints(r.total)}`, 'first win shows the record, not "new record"');
    assert.equal(ui.label, '🎁 Compartir felicitación');
    assert.equal(ui.downloadHidden, true, 'no download link with native share');

    assertPng(await readShareFileBytes(g.page));

    await g.page.tap('#share');
    await g.page.waitForFunction(() => window.__shared !== null, null, { timeout: 3000 });
    const shared = await g.ev(() => window.__shared);
    assert.equal(shared.title, '¡Feliz cumpleaños, David!');
    assert.ok(shared.text.includes(`${formatPoints(r.total)} puntos`), 'share text has the points');
    assert.ok(shared.text.includes(SHARE_URL), 'share text has the URL');
    assert.equal(shared.files.length, 1);
    assert.equal(shared.files[0].name, 'felicidades-david.png');
    assert.equal(shared.files[0].type, 'image/png');
    assert.equal(await g.ev(() => window.__dd.state), 'win', 'sharing keeps the end screen');

    await g.page.tap('#again');
    await waitForState(g.page, 'play');
    const again = await g.ev(() => [window.__dd.coins, localStorage.getItem('dd-best')]);
    assert.deepEqual(again, [0, String(r.total)], 'play again resets coins and keeps the record');

    assertNoErrors(g.errors);
  } finally {
    await g.close();
  }
}

async function clipboardFallbackOnDesktop(browser, baseUrl) {
  const g = await openGame(browser, baseUrl, {
    context: { viewport: { width: 1280, height: 720 }, permissions: ['clipboard-read', 'clipboard-write'] },
    initScript: removeNativeShare,
  });
  try {
    await startWithKeyboard(g.page);
    await reachFlag(g.page);
    await waitForEndPanel(g.page);

    assert.equal(await g.page.textContent('#share'), '📋 Copiar felicitación');
    const downloadVisible = await g.ev(() => {
      const a = document.getElementById('download');
      return !a.classList.contains('hidden') && !!a.href;
    });
    assert.equal(downloadVisible, true, 'download link offered without Web Share');

    await g.page.click('#share');
    await g.page.waitForFunction(() => !document.getElementById('toast').classList.contains('hidden'), null, { timeout: 3000 });
    assert.equal(await g.page.textContent('#toast'), '¡Felicitación copiada! Pégala donde quieras 📋');
    const clip = await g.ev(() => navigator.clipboard.readText());
    assert.ok(clip.startsWith('🎂 ¡Feliz cumpleaños, David! Te he felicitado corriendo en David Dash'), `clipboard text: ${clip.slice(0, 60)}`);
    assert.ok(clip.includes(SHARE_URL));

    assertNoErrors(g.errors);
  } finally {
    await g.close();
  }
}

export default async function share({ browser, baseUrl }) {
  await nativeShareOnPhone(browser, baseUrl);
  await clipboardFallbackOnDesktop(browser, baseUrl);
}
