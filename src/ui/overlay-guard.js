// Keeps on-screen touch buttons clear of foreign overlays injected by the host or
// the browser (e.g. the Netlify free-tier badge in the bottom-right corner).
//
// Host-agnostic: it does not look for a specific badge. Any fixed/sticky element at
// the top level of the page that is NOT part of the game (game elements carry the
// `data-ui` attribute) and overlaps a button group lifts that group just enough.
// With no foreign overlays nothing moves, so it is safe on any hosting.

const GAP = 6;               // px kept between a button and the overlay
const MAX_LIFT_RATIO = 0.4;  // never lift more than 40% of the viewport height
const MAX_OVERLAY_W = 0.6;   // ignore overlays wider than 60% of the viewport...
const MAX_OVERLAY_H = 0.5;   // ...or taller than 50% (modals, cookie walls)
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'LINK', 'META', 'NOSCRIPT', 'TEMPLATE', 'HEAD', 'BODY']);

export const DEFAULT_GROUPS = [
  { cssVar: '--jump-lift', selector: '[data-btn="jump"]' },
  { cssVar: '--pad-lift', selector: '[data-btn="left"], [data-btn="down"], [data-btn="right"]' },
];

export class OverlayGuard {
  /**
   * @param {object} opts
   * @param {HTMLElement} opts.touchRoot element whose CSS variables position the buttons
   * @param {{cssVar: string, selector: string}[]} [opts.groups] buttons that move together
   * @param {() => void} [opts.onChange] called after a lift changes (re-measure touch geometry)
   */
  constructor({ touchRoot, groups = DEFAULT_GROUPS, onChange = () => {} }) {
    this.touchRoot = touchRoot;
    this.groups = groups.map((g) => ({ ...g, lift: 0 }));
    this.onChange = onChange;
    this.pending = false;
  }

  start() {
    const observer = new MutationObserver(() => this.schedule());
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'hidden', 'width', 'height'],
    });
    window.addEventListener('resize', () => this.schedule());
    this.schedule();
  }

  // Coalesce bursts of DOM changes into one measurement per frame.
  schedule() {
    if (this.pending) return;
    this.pending = true;
    requestAnimationFrame(() => {
      this.pending = false;
      this.refresh();
    });
  }

  refresh() {
    const overlays = this.foreignOverlays();
    let changed = false;
    for (const group of this.groups) {
      const lift = this.neededLift(group, overlays);
      if (Math.abs(lift - group.lift) < 1) continue;
      group.lift = lift;
      this.touchRoot.style.setProperty(group.cssVar, `${Math.round(lift)}px`);
      changed = true;
    }
    if (changed) this.onChange();
  }

  /** Rects of visible fixed/sticky top-level elements that do not belong to the game. */
  foreignOverlays() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const candidates = [...document.body.children, ...document.documentElement.children];
    const rects = [];
    for (const el of candidates) {
      if (SKIP_TAGS.has(el.tagName) || el.hasAttribute('data-ui')) continue;
      const cs = getComputedStyle(el);
      if (cs.position !== 'fixed' && cs.position !== 'sticky') continue;
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue;
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0 || r.width > vw * MAX_OVERLAY_W || r.height > vh * MAX_OVERLAY_H) continue;
      rects.push(r);
    }
    return rects;
  }

  // How far the group must move up so no button overlaps any overlay (0 if none).
  neededLift(group, overlays) {
    if (!overlays.length) return 0;
    let needed = 0;
    for (const btn of this.touchRoot.querySelectorAll(group.selector)) {
      const r = btn.getBoundingClientRect();
      if (!r.width) continue;
      // Measure from the resting position (undo the current lift).
      const top = r.top + group.lift;
      const bottom = r.bottom + group.lift;
      for (const o of overlays) {
        const horizontal = r.left < o.right + GAP && r.right > o.left - GAP;
        const vertical = bottom > o.top - GAP && top < o.bottom;
        if (horizontal && vertical) needed = Math.max(needed, bottom - o.top + GAP);
      }
    }
    return Math.min(needed, window.innerHeight * MAX_LIFT_RATIO);
  }
}
