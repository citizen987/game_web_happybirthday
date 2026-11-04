import { CAMERA, PHYSICS, ROLL } from '../config.js';
import { approach, clamp } from '../utils/math.js';

// Smooth follow camera with horizontal look-ahead in the running direction.
export class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.look = 0;
  }

  follow(player, viewW, levelEnd, snap = false) {
    const lookTarget = clamp(player.vx * CAMERA.LOOKAHEAD, -CAMERA.MAX_LOOK, CAMERA.MAX_LOOK);
    this.look = approach(this.look, lookTarget, 1.5);
    const tx = clamp(player.x - viewW * CAMERA.LEAD + this.look, 0, Math.max(0, levelEnd - viewW));
    const ty = clamp(player.y - CAMERA.OFFSET_Y, CAMERA.MIN_Y, CAMERA.MAX_Y);
    if (snap) {
      this.x = tx;
      this.y = ty;
    } else {
      // Follow tighter above running top speed so a fast ball never leaves the screen.
      const fast = clamp((Math.abs(player.vx) - PHYSICS.TOP) / (ROLL.MAX_V - PHYSICS.TOP), 0, 1);
      this.x += (tx - this.x) * (CAMERA.LERP_X + (CAMERA.LERP_X_FAST - CAMERA.LERP_X) * fast);
      this.y += (ty - this.y) * CAMERA.LERP_Y;
    }
  }
}
