// iPhone: side hint to add the game to the home screen (no Fullscreen API there) and a
// "playback" audio session so the silent switch does not mute the game. Android keeps
// requesting fullscreen and shows no hint.
import assert from 'node:assert/strict';
import { PHONE_LANDSCAPE, assertNoErrors, openGame, waitForState } from '../lib/game.js';

const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 '
  + '(KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const ANDROID_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 '
  + '(KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';

const IPHONE = { ...PHONE_LANDSCAPE, userAgent: IPHONE_UA };
const ANDROID = { ...PHONE_LANDSCAPE, userAgent: ANDROID_UA };

// iPhone Safari: no Fullscreen API, and the Audio Session API (Safari 17+).
function emulateIphoneSafari() {
  delete Element.prototype.requestFullscreen;
  delete Element.prototype.webkitRequestFullscreen;
  const session = { type: 'auto' };
  Object.defineProperty(Navigator.prototype, 'audioSession', { get: () => session, configurable: true });
}

// Init scripts are serialized on their own, so this one cannot call emulateIphoneSafari.
function emulateIphoneHomeScreen() {
  delete Element.prototype.requestFullscreen;
  delete Element.prototype.webkitRequestFullscreen;
  Object.defineProperty(Navigator.prototype, 'standalone', { get: () => true, configurable: true });
}

// Records fullscreen requests without changing the page layout.
function spyFullscreen() {
  window.__fullscreenCalls = 0;
  Element.prototype.requestFullscreen = function requestFullscreen() {
    window.__fullscreenCalls += 1;
    return Promise.reject(new Error('fullscreen disabled in tests'));
  };
}

const hint = () => {
  const el = document.getElementById('home-hint');
  if (!el) return { visible: false };
  const r = el.getBoundingClientRect();
  return {
    visible: getComputedStyle(el).display !== 'none' && r.width > 0,
    left: r.left, right: r.right, top: r.top, bottom: r.bottom,
    text: el.textContent,
  };
};

const titleRect = () => {
  const r = document.querySelector('#start .title').getBoundingClientRect();
  return { left: r.left, right: r.right };
};

async function tapToStart(g) {
  const { width, height } = g.page.viewportSize();
  await g.page.touchscreen.tap(width / 2, height / 2);
  await waitForState(g.page, 'play');
}

export default async function ios({ browser, baseUrl }) {
  const iphone = await openGame(browser, baseUrl, { context: IPHONE, initScript: emulateIphoneSafari });
  try {
    const { width } = iphone.page.viewportSize();
    const h = await iphone.ev(hint);
    assert.equal(h.visible, true, 'home-screen hint shown on the iPhone title screen');
    assert.match(h.text, /Añadir a pantalla de inicio/, 'hint explains how to get fullscreen');
    const title = await iphone.ev(titleRect);
    assert.ok(h.left >= title.right, `hint sits at the side, clear of the title (hint ${h.left}, title ${title.right})`);
    assert.ok(h.right <= width, 'hint stays inside the screen');

    await tapToStart(iphone);
    assert.equal((await iphone.ev(hint)).visible, false, 'hint hidden once the game starts');
    assert.equal(await iphone.ev(() => navigator.audioSession.type), 'playback', 'audio session set to playback');
    await iphone.page.waitForFunction(() => window.__dd.audioState === 'running', null, { timeout: 3000 });

    // A context left suspended (e.g. the first gesture was not accepted) recovers on the next tap.
    await iphone.ev(() => window.__dd.suspendAudio());
    await iphone.page.waitForFunction(() => window.__dd.audioState === 'suspended', null, { timeout: 3000 });
    await iphone.page.touchscreen.tap(width / 2, 60);
    await iphone.page.waitForFunction(() => window.__dd.audioState === 'running', null, { timeout: 3000 });
    assertNoErrors(iphone.errors);
  } finally {
    await iphone.close();
  }

  const home = await openGame(browser, baseUrl, { context: IPHONE, initScript: emulateIphoneHomeScreen });
  try {
    assert.equal((await home.ev(hint)).visible, false, 'no hint when already opened from the home screen');
    assertNoErrors(home.errors);
  } finally {
    await home.close();
  }

  const android = await openGame(browser, baseUrl, { context: ANDROID, initScript: spyFullscreen });
  try {
    assert.equal((await android.ev(hint)).visible, false, 'no hint on Android');
    await tapToStart(android);
    assert.equal(await android.ev(() => window.__fullscreenCalls), 1, 'Android still requests fullscreen on start');
    await android.page.waitForFunction(() => window.__dd.audioState === 'running', null, { timeout: 3000 });
    assertNoErrors(android.errors);
  } finally {
    await android.close();
  }
}
