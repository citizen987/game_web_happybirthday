const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowDown: 'down', KeyS: 'down',
  Space: 'jump', KeyZ: 'jump', ArrowUp: 'jump', KeyW: 'jump',
};

const blankState = () => ({ left: false, right: false, down: false, jump: false });

// Merges keyboard and on-screen multitouch buttons into one action state.
// Touch buttons are hit-tested per pointer so a finger can slide between them.
export class Input {
  /**
   * @param {object} opts
   * @param {HTMLElement} opts.touchRoot container with [data-btn] elements
   * @param {() => boolean} opts.isTouchEnabled whether touch buttons drive the game now
   * @param {(target: EventTarget) => boolean} opts.isIgnoredTarget pointers to leave alone (e.g. UI buttons)
   * @param {(e: KeyboardEvent, action: string|undefined) => boolean} opts.onKey returns true when it consumed the key
   */
  constructor({ touchRoot, isTouchEnabled, isIgnoredTarget, onKey }) {
    this.keys = blankState();
    this.touch = blankState();
    this.jumpQueued = false;
    this.touchRoot = touchRoot;
    this.buttons = Array.from(touchRoot.querySelectorAll('[data-btn]'));
    this.geometry = [];
    this.pointers = new Map();
    this.isTouchEnabled = isTouchEnabled;
    this.isIgnoredTarget = isIgnoredTarget;
    this.onKey = onKey;
    this.bindKeyboard();
    this.bindPointers();
  }

  get left() { return this.keys.left || this.touch.left; }
  get right() { return this.keys.right || this.touch.right; }
  get down() { return this.keys.down || this.touch.down; }
  get jump() { return this.keys.jump || this.touch.jump; }

  // Edge-triggered jump: true once per press, kept until a game step consumes it.
  consumeJump() {
    const queued = this.jumpQueued;
    this.jumpQueued = false;
    return queued;
  }

  get touchUIVisible() {
    return this.touchRoot.classList.contains('show');
  }

  enableTouchUI() {
    if (this.touchUIVisible) return;
    this.touchRoot.classList.add('show');
    document.body.classList.add('touch');
    this.layout();
  }

  // Cache button geometry; call after resize or when the buttons become visible.
  layout() {
    this.geometry = this.buttons.map((el) => {
      const r = el.getBoundingClientRect();
      return { name: el.dataset.btn, cx: r.left + r.width / 2, cy: r.top + r.height / 2, r: r.width / 2 };
    });
  }

  reset() {
    this.keys = blankState();
    this.pointers.clear();
    this.refreshTouch();
  }

  bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      const action = KEYMAP[e.code];
      if (this.onKey(e, action)) return;
      if (!action) return;
      e.preventDefault();
      if (action === 'jump' && !this.keys.jump) this.jumpQueued = true;
      this.keys[action] = true;
    });
    window.addEventListener('keyup', (e) => {
      const action = KEYMAP[e.code];
      if (action) this.keys[action] = false;
    });
    window.addEventListener('blur', () => this.reset());
  }

  bindPointers() {
    window.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') this.enableTouchUI();
      if (!this.isTouchEnabled() || !this.touchUIVisible) return;
      if (this.isIgnoredTarget(e.target)) return;
      this.pointers.set(e.pointerId, this.hitButton(e.clientX, e.clientY));
      this.refreshTouch();
      e.preventDefault();
    }, { passive: false });

    window.addEventListener('pointermove', (e) => {
      if (!this.pointers.has(e.pointerId)) return;
      const name = this.hitButton(e.clientX, e.clientY);
      if (name !== this.pointers.get(e.pointerId)) {
        this.pointers.set(e.pointerId, name);
        this.refreshTouch();
      }
    });

    const end = (e) => {
      if (!this.pointers.has(e.pointerId)) return;
      this.pointers.delete(e.pointerId);
      this.refreshTouch();
    };
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  }

  hitButton(x, y) {
    let best = null;
    let bestDist = Infinity;
    for (const b of this.geometry) {
      if (b.r <= 0) continue;
      const d = Math.hypot(x - b.cx, y - b.cy) / b.r;
      if (d < 1.35 && d < bestDist) {
        bestDist = d;
        best = b.name;
      }
    }
    return best;
  }

  refreshTouch() {
    const wasJump = this.touch.jump;
    this.touch = blankState();
    for (const name of this.pointers.values()) if (name) this.touch[name] = true;
    if (this.touch.jump && !wasJump) this.jumpQueued = true;
    for (const el of this.buttons) el.classList.toggle('on', this.touch[el.dataset.btn]);
  }
}
