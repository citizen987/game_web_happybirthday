import { VIEW } from '../config.js';

// Fixed-height low-res canvas whose width follows the screen aspect ratio,
// scaled up with CSS (image-rendering: pixelated) to fill the screen.
export class Display {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = 320;
    this.height = VIEW.HEIGHT;
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.width = Math.max(VIEW.MIN_WIDTH, Math.min(VIEW.MAX_WIDTH, Math.round(this.height * (w / h))));
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx.imageSmoothingEnabled = false;
    const scale = Math.min(w / this.width, h / this.height);
    this.canvas.style.width = `${Math.floor(this.width * scale)}px`;
    this.canvas.style.height = `${Math.floor(this.height * scale)}px`;
  }
}
