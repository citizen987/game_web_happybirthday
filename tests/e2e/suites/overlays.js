// Touch buttons dodge foreign overlays (host badges), host-agnostic.
import assert from 'node:assert/strict';
import { PHONE_LANDSCAPE, assertNoErrors, openGame, waitForState } from '../lib/game.js';

const rect = (sel) => {
  const r = document.querySelector(sel).getBoundingClientRect();
  return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
};

function addOverlay({ id, tag = 'div', style }) {
  const el = document.createElement(tag);
  el.id = id;
  el.style.cssText = `position:fixed;border:0;background:rgba(20,40,50,.9);z-index:2147483645;${style}`;
  document.body.appendChild(el);
}

const lifts = () => {
  const s = getComputedStyle(document.getElementById('touch'));
  return { jump: s.getPropertyValue('--jump-lift').trim() || '0px', pad: s.getPropertyValue('--pad-lift').trim() || '0px' };
};

export default async function overlays({ browser, baseUrl }) {
  const g = await openGame(browser, baseUrl, { context: PHONE_LANDSCAPE });
  const { page, ev } = g;
  const settle = () => page.waitForTimeout(120);
  try {
    await page.touchscreen.tap(422, 195);
    await waitForState(page, 'play');
    await settle();
    assert.deepEqual(await ev(lifts), { jump: '0px', pad: '0px' }, 'no lift without overlays');
    const restJump = await ev(rect, '[data-btn="jump"]');

    // Netlify-like badge: iframe pinned bottom-right over the jump button.
    await ev(addOverlay, { id: 'nl-badge-frame', tag: 'iframe', style: 'bottom:0;right:0;width:200px;height:56px' });
    await settle();
    const badge = await ev(rect, '#nl-badge-frame');
    const lifted = await ev(rect, '[data-btn="jump"]');
    assert.ok(lifted.bottom <= badge.top - 5, `jump clears the badge (jump bottom ${lifted.bottom}, badge top ${badge.top})`);
    assert.ok(lifted.top < restJump.top, 'jump moved up');
    assert.equal((await ev(lifts)).pad, '0px', 'left pad unaffected by a bottom-right badge');

    // The lifted button still works (touch geometry was re-measured).
    await page.touchscreen.tap(lifted.cx, lifted.cy);
    await page.waitForFunction(() => window.__dd.player.airBall || window.__dd.player.vy < 0, null, { timeout: 2000 });

    // Badge removed -> back to rest.
    await ev(() => document.getElementById('nl-badge-frame').remove());
    await settle();
    assert.equal((await ev(lifts)).jump, '0px', 'jump returns when the badge goes away');

    // Any other host toolbar (not Netlify) bottom-left lifts the pad instead.
    await ev(addOverlay, { id: 'other-host-toolbar', style: 'bottom:0;left:0;width:260px;height:60px' });
    await settle();
    const l = await ev(lifts);
    assert.notEqual(l.pad, '0px', 'pad lifted by a generic overlay');
    assert.equal(l.jump, '0px');
    await ev(() => document.getElementById('other-host-toolbar').remove());

    // Big banners (cookie walls, modals) are ignored: they are not corner badges.
    await ev(addOverlay, { id: 'cookie-wall', style: 'bottom:0;left:0;width:100%;height:30%' });
    await settle();
    assert.deepEqual(await ev(lifts), { jump: '0px', pad: '0px' }, 'large overlays ignored');
    assertNoErrors(g.errors);
  } finally {
    await g.close();
  }
}
