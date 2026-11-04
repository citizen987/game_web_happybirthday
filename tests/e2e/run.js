// Runs the e2e suites: `npm test` runs all, `npm test -- roll lives` only the matching ones.
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { startStaticServer } from './lib/server.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');
const SUITES = ['pwa', 'playthrough', 'mobile', 'share', 'lives', 'roll', 'letters', 'pause', 'feel', 'victory-song'];

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const cache = join(homedir(), '.cache', 'ms-playwright');
  if (!existsSync(cache)) return undefined;
  const candidates = readdirSync(cache)
    .filter((d) => /^chromium-\d+$/.test(d))
    .sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]))
    .map((d) => join(cache, d, 'chrome-linux64', 'chrome'))
    .filter((p) => existsSync(p));
  return candidates[0];
}

async function launchBrowser() {
  const executablePath = findChrome();
  try {
    return await chromium.launch({ executablePath });
  } catch (err) {
    console.error(`Could not launch Chromium${executablePath ? ` at ${executablePath}` : ''}.`);
    console.error('Run `npx playwright-core install chromium` or set CHROME_PATH to a Chrome/Chromium binary.');
    throw err;
  }
}

async function main() {
  const filters = process.argv.slice(2);
  const selected = filters.length ? SUITES.filter((s) => filters.some((f) => s.includes(f))) : SUITES;
  if (!selected.length) {
    console.error(`No suite matches: ${filters.join(', ')}. Available: ${SUITES.join(', ')}`);
    process.exit(2);
  }

  const server = await startStaticServer(REPO_ROOT);
  let browser;
  let failed = 0;
  try {
    browser = await launchBrowser();
    for (const name of selected) {
      const { default: run } = await import(`./suites/${name}.js`);
      const t0 = Date.now();
      try {
        await run({ browser, baseUrl: server.baseUrl });
        console.log(`PASS ${name} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
      } catch (err) {
        failed++;
        console.log(`FAIL ${name}: ${err.message}`);
        if (process.env.E2E_VERBOSE) console.log(err.stack);
      }
    }
  } finally {
    if (browser) await browser.close();
    await server.close();
  }
  console.log(`\n${selected.length - failed}/${selected.length} suites passed`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
