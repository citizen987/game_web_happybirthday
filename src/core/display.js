import { VIEW } from '../config.js';

// Fixed 16:9 low-res canvas (320x180) scaled up with CSS (image-rendering: pixelated)
// as large as the screen allows while keeping its aspect ratio. Leftover space shows
// the body background as pillarbox/letterbox bands (see css/styles.css).
export class Display {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = VIEW.WIDTH;
    this.height = VIEW.HEIGHT;
    this.hudInsetRight = 0;
    canvas.width = this.width;
    canvas.height = this.height;
  }

  resize() {
    // Setting the size resets the 2D context state, so smoothing must be disabled again.
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx.imageSmoothingEnabled = false;
    const scale = Math.min(window.innerWidth / this.width, window.innerHeight / this.height);
    this.canvas.style.width = `${Math.floor(this.width * scale)}px`;
    this.canvas.style.height = `${Math.floor(this.height * scale)}px`;
  }

  /**
   * Internal pixels at the canvas' right edge covered by fixed DOM buttons (pause/mute)
   * in the HUD row. 0 when they sit in the letterbox band. Call after resize and when
   * the buttons' visibility changes.
   */
  measureHudInsetRight(elements) {
    const c = this.canvas.getBoundingClientRect();
    if (!c.width) return 0;
    const scale = c.width / this.width;
    const hudBottom = c.top + 18 * scale;
    let inset = 0;
    for (const el of elements) {
      const r = el.getBoundingClientRect();
      if (!r.width || r.bottom <= c.top || r.top >= hudBottom || r.left >= c.right) continue;
      inset = Math.max(inset, (c.right - r.left) / scale + 2);
    }
    this.hudInsetRight = inset;
    return inset;
  }
}
