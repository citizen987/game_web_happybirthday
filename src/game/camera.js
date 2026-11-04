import { CAMERA } from '../config.js';
import { approach, clamp } from '../utils/math.js';

// Smooth follow camera with horizontal look-ahead in the running direction.
export class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.look = 0;
  }

  follow(player, viewW, levelEnd, snap = false) {
    this.look = approach(this.look, player.vx * CAMERA.LOOKAHEAD, 1.5);
    const tx = clamp(player.x - viewW * CAMERA.LEAD + this.look, 0, Math.max(0, levelEnd - viewW));
    const ty = clamp(player.y - CAMERA.OFFSET_Y, CAMERA.MIN_Y, CAMERA.MAX_Y);
    if (snap) {
      this.x = tx;
      this.y = ty;
    } else {
      this.x += (tx - this.x) * CAMERA.LERP_X;
      this.y += (ty - this.y) * CAMERA.LERP_Y;
    }
  }
}
