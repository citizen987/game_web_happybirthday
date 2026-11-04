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
}
