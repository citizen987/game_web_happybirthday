// PWA static checks: every game module is precached, every precached path exists,
// the manifest parses and the page links it. No browser needed for the file checks.
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DESKTOP, assertNoErrors, openGame } from '../lib/game.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

function listJs(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return listJs(full);
    return name.endsWith('.js') ? [relative(ROOT, full).split('\\').join('/')] : [];
  });
}

function readPrecache() {
  const sw = readFileSync(join(ROOT, 'sw.js'), 'utf8');
  const match = sw.match(/const PRECACHE = \[([\s\S]*?)\];/);
  assert.ok(match, 'sw.js defines PRECACHE');
  return [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

export default async function pwa({ browser, baseUrl }) {
  const precache = readPrecache();
  const missingFromPrecache = listJs(join(ROOT, 'src')).filter((f) => !precache.includes(f));
  assert.deepEqual(missingFromPrecache, [], 'every src module is in sw.js PRECACHE (update it and bump CACHE_VERSION)');
  const missingOnDisk = precache.filter((p) => p !== './' && !existsSync(join(ROOT, p)));
  assert.deepEqual(missingOnDisk, [], 'every PRECACHE path exists');

  const manifest = JSON.parse(readFileSync(join(ROOT, 'manifest.webmanifest'), 'utf8'));
  assert.equal(manifest.name, 'David Dash');
  for (const icon of manifest.icons) assert.ok(existsSync(join(ROOT, icon.src)), `icon exists: ${icon.src}`);

  const g = await openGame(browser, baseUrl, { context: DESKTOP });
  try {
    const head = await g.ev(() => ({
      manifest: document.querySelector('link[rel="manifest"]')?.getAttribute('href'),
      ogImage: document.querySelector('meta[property="og:image"]')?.content,
      robots: document.querySelector('meta[name="robots"]')?.content,
    }));
    assert.equal(head.robots, 'noindex, nofollow', 'page asks search engines not to index it');
    const robotsTxt = readFileSync(join(ROOT, 'robots.txt'), 'utf8');
    assert.match(robotsTxt, /User-agent: \*\s+Disallow: \//, 'robots.txt blocks search engines');
    assert.match(robotsTxt, /User-agent: WhatsApp/, 'robots.txt keeps link-preview bots allowed');
    assert.equal(head.manifest, 'manifest.webmanifest');
    assert.ok(head.ogImage && head.ogImage.startsWith('https://'), 'og:image is an absolute URL');
    assert.ok(existsSync(join(ROOT, new URL(head.ogImage).pathname.slice(1))), 'og:image file exists in the repo');
    assertNoErrors(g.errors);
  } finally {
    await g.close();
  }

  // Runtime offline check. The game only registers the worker over HTTPS, but
  // localhost is a secure context, so we register it by hand here.
  const o = await openGame(browser, baseUrl, { context: DESKTOP });
  try {
    await o.ev(async () => {
      await navigator.serviceWorker.register('./sw.js');
      await navigator.serviceWorker.ready;
    });
    await o.page.reload();
    await o.page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await o.context.setOffline(true);
    for (const path of ['/?debug', '/index.html?debug']) {
      await o.page.goto(`${baseUrl}${path}`);
      await o.page.waitForFunction(() => window.__dd && window.__dd.state === 'title', null, { timeout: 5000 });
    }
    await o.page.keyboard.press('Enter');
    await o.page.waitForFunction(() => window.__dd.state === 'play');
    await o.context.setOffline(false);
    // Service worker precache warnings would show up as console warnings: none expected.
    assertNoErrors(o.errors);
  } finally {
    await o.close();
  }
}
