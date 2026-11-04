import { rand } from '../utils/math.js';
import { drawClouds, drawHills, drawMountains, drawSky, drawWater } from './background.js';
import { drawCheckpoints, drawCoins, drawEffects, drawEnemies, drawFlag, drawLetters } from './entities-view.js';
import { drawHud } from './hud.js';
import { drawAura, drawPlayer } from './player-view.js';
import { createDirtPattern, drawDeco, drawGround, drawPlatforms } from './terrain-view.js';

// Draws one frame from game state. Read-only: never mutates the game.
export class Renderer {
  constructor(display, head) {
    this.display = display;
    this.head = head;
    this.dirt = createDirtPattern(display.ctx);
  }

  render(game) {
    const { ctx, width, height } = this.display;
    const world = game.world;
    const level = game.level;

    const shakeX = world.shake > 0 ? Math.round(rand(-2, 2)) : 0;
    const shakeY = world.shake > 0 ? Math.round(rand(-2, 2)) : 0;
    const view = {
      cx: Math.round(game.camera.x) + shakeX,
      cy: Math.round(game.camera.y) + shakeY,
      w: width,
      h: height,
      tick: game.tick,
    };

    drawSky(ctx, view);
    drawClouds(ctx, view);
    drawMountains(ctx, view);
    drawHills(ctx, view);

    ctx.save();
    ctx.translate(-view.cx, -view.cy);
    drawWater(ctx, view);
    drawGround(ctx, view, level.terrain, this.dirt);
    drawDeco(ctx, view, level.deco);
    drawPlatforms(ctx, world.platforms, this.dirt);
    drawCheckpoints(ctx, view, world.checkpoints);
    drawFlag(ctx, view, level.flagX, level.terrain);
    drawCoins(ctx, view, world.coins, world.lostCoins);
    drawLetters(ctx, view, world.letters);
    drawEnemies(ctx, view, world.enemies);
    const p = world.player;
    const blinking = !p.dying && p.inv > 0 && game.state === 'play' && (p.inv >> 2) % 2 === 0;
    const transforming = game.freeze > 0;
    if ((world.super || transforming) && !p.dying) drawAura(ctx, p, game.tick);
    if (!blinking) drawPlayer(ctx, p, this.head);
    drawEffects(ctx, world.particles, world.confetti);
    ctx.restore();

    if (game.state !== 'title') {
      drawHud(ctx, {
        lives: world.lives,
        coinCount: world.coinCount,
        icon: this.head.icon,
        letters: world.letters,
        viewW: width,
        tick: game.tick,
        superForm: world.super,
      });
    }
    if (world.flash > 0) {
      ctx.fillStyle = `rgba(255,248,200,${Math.min(1, world.flash / 16)})`;
      ctx.fillRect(0, 0, width, height);
    }
    if (world.fade > 0) {
      ctx.fillStyle = `rgba(255,255,255,${world.fade / 24})`;
      ctx.fillRect(0, 0, width, height);
    }
  }
}
