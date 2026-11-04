import { ROLL } from '../config.js';
import { rect } from './draw.js';

// Mirrors game/player.js isBall (render must not depend on the game layer).
const isBall = (p) => p.rolling || p.charging || p.airBall;

const COL = {
  shirt: '#e8282e', shirtD: '#a9141b', skin: '#f3c39b', skinD: '#d39a72',
  jeans: '#2d55b0', jeansD: '#1f3c80', shoe: '#ffffff', shoeD: '#c8cad8',
  red: '#e8282e', redD: '#b01a20',
};

// Picks foot/arm positions for the current state (idle, run, jump, fall, crouch, hurt).
function computePose(p) {
  const pose = {
    hipY: -8, bob: 0, crouch: false, armsUp: false,
    backFoot: [-2, 0], frontFoot: [2, 0], backArm: 0, frontArm: 0,
  };
  if (p.hurt || p.dying) {
    pose.backFoot = [-4, -1];
    pose.frontFoot = [4, -2];
    pose.armsUp = true;
  } else if (!p.onGround) {
    if (p.vy < 0) {
      pose.backFoot = [-2, -1];
      pose.frontFoot = [3, -3];
      pose.armsUp = true;
    } else {
      pose.backFoot = [-3, 0];
      pose.frontFoot = [3, -1];
    }
  } else if (p.crouch) {
    pose.crouch = true;
    pose.hipY = -5;
    pose.backFoot = [-3, 0];
    pose.frontFoot = [3, 0];
  } else if (Math.abs(p.vx) > 0.1) {
    const s = Math.sin(p.runT);
    const c = Math.cos(p.runT);
    const stride = Math.abs(p.vx) > 4.5 ? 5 : 4;
    pose.frontFoot = [Math.round(1 + s * stride), -Math.round(Math.max(0, c) * 3)];
    pose.backFoot = [Math.round(-1 - s * stride), -Math.round(Math.max(0, -c) * 3)];
    pose.frontArm = Math.round(-s * 3);
    pose.backArm = -pose.frontArm;
    pose.bob = Math.abs(s) > 0.7 ? 0 : -1;
  }
  return pose;
}

const BALL = {
  segments: ['#2d6ae8', '#e8282e', '#2d6ae8', '#e8282e'],
  shade: ['#1f3c80', '#a9141b', '#1f3c80', '#a9141b'],
  outline: '#1a1030',
  shine: '#ffffff',
};

/**
 * Original blue/red ball: four rotating segments (quarters), shaded on the
 * lower-right, dark outline and a fixed highlight. Drawn pixel by pixel.
 */
function drawBall(ctx, p) {
  const r = ROLL.RADIUS;
  const cx = Math.round(p.x);
  const cy = Math.round(p.y) - r - 1;
  const quarter = Math.PI / 2;
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > r + 0.5) continue;
      let color;
      if (d > r - 0.5) {
        color = BALL.outline;
      } else {
        const a = Math.atan2(dy, dx) + p.spin;
        const seg = ((Math.floor(a / quarter) % 4) + 4) % 4;
        color = dx + dy > r * 0.6 ? BALL.shade[seg] : BALL.segments[seg];
      }
      rect(ctx, cx + dx, cy + dy, 1, 1, color);
    }
  }
  // Highlight: small arc on the upper-left, scaled with the radius.
  const sx = cx - Math.round(r * 0.55);
  const sy = cy - Math.round(r * 0.55);
  rect(ctx, sx + 1, sy - 1, 3, 1, BALL.shine);
  rect(ctx, sx - 1, sy + 1, 1, 3, BALL.shine);
  rect(ctx, sx, sy, 1, 1, BALL.shine);
}

/**
 * Small pixel-art body with the big photo head on top (or a ball while rolling,
 * charging or jumping). Local coords: x=0 is the
 * body center, y=0 the feet; `face` mirrors the drawing horizontally.
 */
export function drawPlayer(ctx, p, head) {
  if (isBall(p)) {
    drawBall(ctx, p);
    return;
  }
  const ox = Math.round(p.x);
  const oy = Math.round(p.y);
  const f = p.face;
  const R = (lx, ly, w, h, c) => rect(ctx, f > 0 ? ox + lx : ox - lx - w, oy + ly, w, h, c);

  const leg = (hipX, hipY, fx, fy, back) => {
    const color = back ? COL.jeansD : COL.jeans;
    const footTop = fy - 3;
    const span = Math.max(1, footTop - hipY);
    for (let ly = hipY; ly < footTop; ly++) {
      const t = (ly - hipY) / span;
      R(Math.round(hipX + (fx - hipX) * t) - 1, ly, 3, 1, color);
    }
    R(fx - 2, fy - 3, 4, 1, back ? COL.shoeD : COL.shoe);
    R(fx - 2, fy - 2, 5, 1, back ? COL.redD : COL.red);
    R(fx - 2, fy - 1, 6, 1, back ? COL.shoeD : COL.shoe);
  };

  const pose = computePose(p);
  const hipY = pose.hipY + pose.bob;
  const top = hipY - (pose.crouch ? 6 : 7);

  leg(-1, hipY, pose.backFoot[0], pose.backFoot[1], true);
  if (pose.armsUp) {
    R(-5, top - 5, 2, 6, COL.skinD);
  } else {
    R(-1 + pose.backArm, top + 1, 2, 2, COL.shirtD);
    R(-1 + pose.backArm, top + 3, 2, 3, COL.skinD);
  }
  R(-3, hipY - 1, 6, 2, COL.jeans);
  R(-4, top, 8, hipY - 1 - top, COL.shirt);
  R(-4, top, 2, hipY - 1 - top, COL.shirtD);
  R(1, top + 2, 2, 2, '#ffffff');
  leg(1, hipY, pose.frontFoot[0], pose.frontFoot[1], false);
  if (pose.armsUp) {
    R(2, top, 3, 2, COL.shirt);
    R(3, top - 5, 2, 6, COL.skin);
  } else {
    R(pose.frontArm, top + 1, 3, 2, COL.shirt);
    R(1 + pose.frontArm, top + 3, 2, 3, COL.skin);
  }

  const chinY = top + 2;
  if (head.ready) {
    const { FACE_X, CHIN_Y } = head.config;
    const hx = f > 0 ? ox + 2 - FACE_X : ox - 2 - (head.width - FACE_X);
    ctx.drawImage(f > 0 ? head.right : head.left, hx, oy + chinY - CHIN_Y);
  } else {
    R(-7, chinY - 16, 14, 16, COL.skin);
    R(-7, chinY - 18, 14, 4, '#2a6ae8');
  }
}
