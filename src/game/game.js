import { LIVES, PLAYER, VIEW, WIN, WORLD } from '../config.js';
import { rand } from '../utils/math.js';
import { Camera } from './camera.js';
import { spawnConfetti, spawnFirework, updateEffects } from './effects.js';
import { updateEnemies } from './enemies.js';
import { updatePickups } from './pickups.js';
import { clearBall, createPlayer, updatePlayer } from './player.js';
import { computeScore } from './score.js';
import { createWorld, updatePlatforms } from './world.js';

/**
 * Game state machine: 'title' -> 'play' -> 'win' | 'gameover' (-> 'play' on restart).
 * Pure logic: no DOM. Feedback goes out through `sfx` (by event name), `music`,
 * and the `onStateChange` / `onShowWin(result)` / `onGameOver()` callbacks.
 */
export class Game {
  constructor({ level, sfx, music, onStateChange = () => {}, onShowWin = () => {}, onGameOver = () => {} }) {
    this.level = level;
    this.sfx = sfx;
    this.music = music;
    this.onStateChange = onStateChange;
    this.onShowWin = onShowWin;
    this.onGameOver = onGameOver;
    this.state = 'title';
    this.tick = 0;
    this.camera = new Camera();
    this.reset(320);
  }

  reset(viewW) {
    this.world = createWorld(this.level);
    this.endT = 0;          // frames since win/gameover started
    this.endShown = false;  // end overlay visible (enables Enter/Space to restart)
    this.playFrames = 0;
    this.result = null;     // score; stays null on gameover
    this.camera.look = 0;
    this.camera.follow(this.world.player, viewW, this.level.terrain.end, true);
  }

  setState(state) {
    this.state = state;
    this.onStateChange(state);
  }

  start(viewW) {
    if (this.state !== 'title') return false;
    this.restart(viewW);
    return true;
  }

  restart(viewW) {
    this.reset(viewW);
    this.setState('play');
    this.music.start();
  }

  // Debug helper: drop the player at x on the ground.
  teleport(x, viewW) {
    this.world.player = createPlayer(this.level.terrain, x);
    this.camera.follow(this.world.player, viewW, this.level.terrain.end, true);
  }

  // Single place where a life is lost (fall into a gap or end of the death animation).
  loseLife(viewW) {
    const w = this.world;
    w.lives = Math.max(0, w.lives - 1);
    if (w.lives > 0) this.respawn(viewW);
    else this.triggerGameOver();
  }

  respawn(viewW) {
    const w = this.world;
    w.player = createPlayer(w.terrain, w.lastCheckpoint.x);
    w.player.inv = PLAYER.RESPAWN_INVULN;
    w.fade = 24;
    this.camera.look = 0;
    this.camera.follow(w.player, viewW, w.terrain.end, true);
  }

  triggerWin() {
    clearBall(this.world.player); // celebrate with David's face, not as a ball
    this.result = computeScore({
      coins: this.world.coinCount,
      frames: this.playFrames,
      totalCoins: this.level.coins.length,
    });
    this.setState('win');
    this.endT = 0;
    this.music.stop();
    this.world.events.push('goal');
  }

  triggerGameOver() {
    this.result = null;
    this.setState('gameover');
    this.endT = 0;
    this.music.stop();
    this.world.events.push('gameover');
  }

  update(input, viewW) {
    this.tick++;
    const jumpPressed = input.consumeJump();
    if (this.state === 'title') return;
    const playing = this.state === 'play';
    if (playing) this.playFrames++;

    const w = this.world;
    updatePlatforms(w, this.tick);
    updatePlayer(w, input, jumpPressed, this.state);
    if (playing) this.checkLifeLoss(viewW);
    updateEnemies(w, this.state === 'play' && !w.player.dying);
    if (updatePickups(w) && this.state === 'play') this.triggerWin();
    updateEffects(w, this.camera.y, VIEW.HEIGHT);
    if (this.state === 'win') this.updateWin(viewW);
    else if (this.state === 'gameover') this.updateGameOver(viewW);
    this.camera.follow(w.player, viewW, w.terrain.end);
    if (w.fade > 0) w.fade--;
    if (w.shake > 0) w.shake--;
    this.flushEvents();
  }

  checkLifeLoss(viewW) {
    const p = this.world.player;
    if (p.dying) {
      if (p.dieT >= LIVES.DEATH_FRAMES) this.loseLife(viewW);
    } else if (p.y > WORLD.DEATH_Y) {
      this.world.events.push('fall');
      this.loseLife(viewW);
    }
  }

  updateWin(viewW) {
    this.endT++;
    const w = this.world;
    const p = w.player;
    if (p.onGround && this.endT > 24) {
      p.vy = WIN.JOY_JUMP_V;
      p.onGround = false;
      p.onPlat = null;
    }
    if (this.endT % WIN.FIREWORK_EVERY === 1) {
      spawnFirework(w, this.camera.x + rand(30, viewW - 30), this.camera.y + rand(18, 80));
      w.events.push('firework');
    }
    spawnConfetti(w, this.camera.x, this.camera.y, viewW);
    if (this.endT === WIN.SHOW_OVERLAY_AT) {
      this.endShown = true;
      this.onShowWin(this.result);
    }
  }

  // No score, but the party for David goes on: confetti and the congratulation overlay.
  updateGameOver(viewW) {
    this.endT++;
    spawnConfetti(this.world, this.camera.x, this.camera.y, viewW);
    if (this.endT === LIVES.GAMEOVER_OVERLAY_AT) {
      this.endShown = true;
      this.onGameOver();
    }
  }

  flushEvents() {
    // Events are names, or { name, arg } when the sound needs a parameter.
    const events = this.world.events;
    for (const event of events) {
      const name = typeof event === 'string' ? event : event.name;
      const play = this.sfx[name];
      if (play) play(event.arg);
      else console.warn(`No sound registered for game event "${name}"`);
    }
    events.length = 0;
  }
}
