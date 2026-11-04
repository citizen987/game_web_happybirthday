// Build stamp: the title screen shows the deployed commit (hash, date and time, Madrid
// time) in a bottom corner; locally it shows "dev". The deploy script stamps a copy.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PHONE_LANDSCAPE, assertNoErrors, openGame, waitForState } from '../lib/game.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const STAMP_SCRIPT = join(ROOT, '.github', 'scripts', 'stamp-version.sh');
const STAMP_FORMAT = /^[0-9a-f]{7,} · \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/;

const label = () => {
  const el = document.getElementById('version');
  if (!el) return { visible: false };
  const r = el.getBoundingClientRect();
  return {
    visible: getComputedStyle(el).display !== 'none' && r.width > 0,
    text: el.textContent, left: r.left, bottom: r.bottom,
  };
};

function stampCopy() {
  const dir = mkdtempSync(join(tmpdir(), 'dd-version-'));
  try {
    const file = join(dir, 'version.js');
    copyFileSync(join(ROOT, 'src', 'version.js'), file);
    execFileSync('bash', [STAMP_SCRIPT, file], { cwd: ROOT, stdio: 'pipe' });
    const stamped = readFileSync(file, 'utf8');
    const match = stamped.match(/export const VERSION = '([^']*)';/);
    assert.ok(match, 'stamped file still exports VERSION');
    return match[1];
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function stampMissingPlaceholderFails() {
  const dir = mkdtempSync(join(tmpdir(), 'dd-version-'));
  try {
    const file = join(dir, 'version.js');
    copyFileSync(join(ROOT, 'src', 'version.js'), file);
    execFileSync('bash', [STAMP_SCRIPT, file], { cwd: ROOT, stdio: 'pipe' });
    // Already stamped: the placeholder is gone, so a second run must fail loudly.
    execFileSync('bash', [STAMP_SCRIPT, file], { cwd: ROOT, stdio: 'pipe' });
    return false;
  } catch {
    return true;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export default async function version({ browser, baseUrl }) {
  const stamp = stampCopy();
  assert.match(stamp, STAMP_FORMAT, `deploy stamp is "hash · DD/MM/YYYY HH:MM" (got "${stamp}")`);
  const head = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT }).toString().trim();
  assert.ok(stamp.startsWith(head), `stamp uses the current commit (${head})`);
  assert.equal(stampMissingPlaceholderFails(), true, 'stamping fails when the placeholder is missing');

  const g = await openGame(browser, baseUrl, { context: PHONE_LANDSCAPE });
  try {
    const { width, height } = g.page.viewportSize();
    const v = await g.ev(label);
    assert.equal(v.visible, true, 'version label shown on the title screen');
    assert.equal(v.text, 'dev', 'local (unstamped) build shows "dev"');
    assert.ok(v.left < width / 4 && v.bottom > height * 0.8, `label sits in the bottom-left corner (${v.left}, ${v.bottom})`);

    await g.page.touchscreen.tap(width / 2, height / 2);
    await waitForState(g.page, 'play');
    assert.equal((await g.ev(label)).visible, false, 'label hidden during play');
    assertNoErrors(g.errors);
  } finally {
    await g.close();
  }
}
