// Fails if a game module is missing from the service worker PRECACHE or a
// PRECACHE path does not exist (same rule as the `pwa` e2e suite, no browser).
// Run from the repo root: node .github/scripts/check-precache.mjs
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const listJs = (dir) => readdirSync(dir).flatMap((name) => {
  const full = join(dir, name);
  return statSync(full).isDirectory() ? listJs(full) : name.endsWith('.js') ? [full.split('\\').join('/')] : [];
});

const match = readFileSync('sw.js', 'utf8').match(/const PRECACHE = \[([\s\S]*?)\];/);
if (!match) throw new Error('sw.js: PRECACHE not found');
const precache = [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);

const notPrecached = listJs('src').filter((f) => !precache.includes(f));
const missing = precache.filter((p) => p !== './' && !existsSync(p));
if (notPrecached.length || missing.length) {
  if (notPrecached.length) console.error(`Not in sw.js PRECACHE: ${notPrecached.join(', ')}`);
  if (missing.length) console.error(`PRECACHE paths missing on disk: ${missing.join(', ')}`);
  console.error('Update PRECACHE in sw.js and bump CACHE_VERSION.');
  process.exit(1);
}
console.log(`PRECACHE OK (${precache.length} paths)`);
