import { PLAYER, VIEW, WIN, WORLD } from '../config.js';
import { rand } from '../utils/math.js';
import { Camera } from './camera.js';
import { spawnConfetti, spawnFirework, updateEffects } from './effects.js';
import { updateEnemies } from './enemies.js';
import { updatePickups } from './pickups.js';
import { createPlayer, updatePlayer } from './player.js';
import { createWorld, updatePlatforms } from './world.js';

/**
 * Game state machine: 'title' -> 'play' -> 'win' (-> 'play' on restart).
 * Pure logic: no DOM. Feedback goes out through `sfx` (by event name),
 * `music`, and the `onStateChange` / `onShowWin` callbacks.
 */
export class Game {
  constructor({ level, sfx, music, onStateChange = () => {}, onShowWin = () => {} }) {
    this.level = level;
    this.sfx = sfx;
    this.music = music;
    this.onStateChange = onStateChange;
    this.onShowWin = onShowWin;
    this.state = 'title';
    this.tick = 0;
    this.camera = new Camera();
    this.winT = 0;
    this.winShown = false;
    this.reset(320);
  }

  reset(viewW) {
    this.world = createWorld(this.level);
    this.winT = 0;
    this.winShown = false;
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

  respawn(viewW) {
    const w = this.world;
    w.player = createPlayer(w.terrain, w.lastCheckpoint.x);
    w.player.inv = PLAYER.RESPAWN_INVULN;
    w.fade = 24;
    w.events.push('fall');
    this.camera.look = 0;
    this.camera.follow(w.player, viewW, w.terrain.end, true);
  }

  triggerWin() {
    this.setState('win');
    this.winT = 0;
    this.music.stop();
    this.world.events.push('goal');
  }

  update(input, viewW) {
    this.tick++;
    const jumpPressed = input.consumeJump();
    if (this.state === 'title') return;

    const w = this.world;
    updatePlatforms(w, this.tick);
    updatePlayer(w, input, jumpPressed, this.state);
    if (w.player.y > WORLD.DEATH_Y) this.respawn(viewW);
    updateEnemies(w, this.state === 'play');
    if (updatePickups(w) && this.state === 'play') this.triggerWin();
    updateEffects(w, this.camera.y, VIEW.HEIGHT);
    if (this.state === 'win') this.updateWin(viewW);
    this.camera.follow(w.player, viewW, w.terrain.end);
    if (w.fade > 0) w.fade--;
    if (w.shake > 0) w.shake--;
    this.flushEvents();
  }

  updateWin(viewW) {
    this.winT++;
    const w = this.world;
    const p = w.player;
    if (p.onGround && this.winT > 24) {
      p.vy = WIN.JOY_JUMP_V;
      p.onGround = false;
      p.onPlat = null;
    }
    if (this.winT % WIN.FIREWORK_EVERY === 1) {
      spawnFirework(w, this.camera.x + rand(30, viewW - 30), this.camera.y + rand(18, 80));
      w.events.push('firework');
    }
    spawnConfetti(w, this.camera.x, this.camera.y, viewW);
    if (this.winT === WIN.SHOW_OVERLAY_AT) {
      this.winShown = true;
      this.onShowWin();
    }
  }

  flushEvents() {
    const events = this.world.events;
    for (const name of events) {
      const play = this.sfx[name];
      if (play) play();
      else console.warn(`No sound registered for game event "${name}"`);
    }
    events.length = 0;
  }
}
