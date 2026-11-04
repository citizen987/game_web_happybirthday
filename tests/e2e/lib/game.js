import assert from 'node:assert/strict';

export const DESKTOP = { viewport: { width: 960, height: 540 } };
export const PHONE_LANDSCAPE = { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
export const PHONE_PORTRAIT = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };

// Headless Chromium has no Web Share API: this init script records what the game would share.
export function mockNativeShare() {
  window.__shared = null;
  navigator.share = async (data) => {
    window.__shared = {
      title: data.title,
      text: data.text,
      files: (data.files || []).map((f) => ({ name: f.name, type: f.type, size: f.size })),
    };
  };
  navigator.canShare = (data) => !!(data && data.files);
}

// Removes the Web Share API so the clipboard fallback is exercised.
export function removeNativeShare() {
  delete Navigator.prototype.share;
  delete Navigator.prototype.canShare;
}

/**
 * Opens a fresh context + page on the game in debug mode and records page errors,
 * console errors and console warnings. Call `close()` in a `finally` block.
 */
export async function openGame(browser, baseUrl, { context: contextOptions = {}, initScript } = {}) {
  const context = await browser.newContext(contextOptions);
  if (initScript) await context.addInitScript(initScript);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e}`));
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') errors.push(`console.${m.type()}: ${m.text()}`);
  });
  await page.goto(`${baseUrl}/index.html?debug`);
  await page.waitForFunction(() => window.__dd && window.__dd.state === 'title');
  return {
    context,
    page,
    errors,
    ev: (fn, arg) => page.evaluate(fn, arg),
    wait: (ms) => page.waitForTimeout(ms),
    // Waits roughly `n` simulation frames (60 Hz) plus a small margin.
    frames: (n) => page.waitForTimeout(Math.ceil((n * 1000) / 60) + 150),
    close: () => context.close(),
  };
}

export async function startWithKeyboard(page) {
  await page.keyboard.press('Enter');
  await waitForState(page, 'play');
}

export function waitForState(page, state, timeout = 5000) {
  return page.waitForFunction((s) => window.__dd.state === s, state, { timeout });
}

export function assertNoErrors(errors) {
  assert.deepEqual(errors, [], 'no page errors, console errors or warnings');
}

// Teleports near the flag and holds right until the run is won.
export async function reachFlag(page) {
  await page.evaluate(() => window.__dd.teleport(window.__dd.flagX - 150));
  await page.keyboard.down('ArrowRight');
  await waitForState(page, 'win', 15000);
  await page.keyboard.up('ArrowRight');
}

/**
 * Waits until the end overlay is shown and the share card is generated; on a win
 * it also waits for the score count-up to reach the final total.
 */
export async function waitForEndPanel(page) {
  await page.waitForFunction(() => !document.getElementById('win').classList.contains('hidden'), null, { timeout: 5000 });
  await page.waitForFunction(() => window.__dd.shareFile !== null, null, { timeout: 6000 });
  await page.waitForFunction(() => {
    const r = window.__dd.result;
    if (!r) return true;
    const total = String(Math.round(r.total)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return document.getElementById('score-total').textContent === total;
  }, null, { timeout: 6000 });
}

export async function readShareFileBytes(page) {
  const bytes = await page.evaluate(async () => Array.from(new Uint8Array(await window.__dd.shareFile.arrayBuffer())));
  return Buffer.from(bytes);
}

export function assertPng(buffer) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.ok(buffer.length > 1000, `share card has content (${buffer.length} bytes)`);
  assert.ok(buffer.subarray(0, 8).equals(signature), 'share card is a PNG');
}
