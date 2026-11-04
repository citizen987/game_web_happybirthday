// Composition root: creates every module, wires them together and runs the loop.
import { createSfx } from './audio/sfx.js';
import { MusicPlayer } from './audio/music.js';
import { ASSETS, AUTHOR, HEAD_SPRITE, SUPER, TIMESTEP } from './config.js';
import { AudioEngine } from './core/audio.js';
import { Display } from './core/display.js';
import { Input } from './core/input.js';
import { Game } from './game/game.js';
import { HeadSprite } from './render/head-sprite.js';
import { timerBox } from './render/hud.js';
import { Renderer } from './render/renderer.js';
import {
  blockBrowserGestures, isTouchDevice, needsHomeScreenHint, portraitQuery, prefersTouchControls, requestLandscapeFullscreen,
} from './ui/device.js';
import { MuteButton } from './ui/mute-button.js';
import { OverlayGuard } from './ui/overlay-guard.js';
import { registerServiceWorker } from './ui/pwa.js';
import { Screens } from './ui/screens.js';
import { ShareFlow } from './ui/share-flow.js';
import { VERSION } from './version.js';
import { buildLevel } from './world/level.js';

const display = new Display(document.getElementById('game'));
const audio = new AudioEngine();
const music = new MusicPlayer(audio);
const screens = new Screens(document);
const muteButton = new MuteButton(document.getElementById('mute'), audio);
const level = buildLevel();
const head = new HeadSprite(ASSETS.HEAD, HEAD_SPRITE);

const shareFlow = new ShareFlow({ screens, head });

let input = null;
let overlayGuard = null;

const game = new Game({
  level,
  sfx: createSfx(audio),
  music,
  onStateChange: (state) => {
    screens.setState(state);
    measureHudInset();
    if (state === 'play') {
      overlayGuard.refresh();
      input.layout();
    }
  },
  onShowWin: (result) => shareFlow.showWin(result),
  onGameOver: () => shareFlow.showGameOver(),
  onTransform: () => screens.showBanner(SUPER.BANNER),
});

// Unlock on every start event, not only the first: iOS may reject the first one as a gesture.
function startGame() {
  audio.unlock();
  if (game.state !== 'title') return;
  if (isTouchDevice) requestLandscapeFullscreen();
  screens.hideStart();
  game.start(display.width);
}

function playAgain() {
  audio.unlock();
  shareFlow.reset();
  screens.hideWin();
  screens.hideBanner();
  input.reset();
  game.restart(display.width);
}

// Pause freezes the simulation and suspends audio; only available during play.
function setPaused(paused) {
  if (!game.setPaused(paused)) return;
  screens.setPaused(paused);
  input.reset();
  if (paused) audio.suspend();
  else audio.resume();
}
const togglePause = () => setPaused(!game.paused);

// Screen-level keys handled before gameplay input.
function handleKey(e, action) {
  if (e.code === 'KeyM') {
    audio.toggleMute();
    return true;
  }
  if ((e.code === 'KeyP' || e.code === 'Escape') && game.state === 'play' && !e.repeat) {
    e.preventDefault();
    togglePause();
    return true;
  }
  if (game.paused) return true;
  if (game.state === 'title') {
    if (!e.repeat) startGame();
    if (action) e.preventDefault();
    return true;
  }
  const ended = game.state === 'win' || game.state === 'gameover';
  // Let a focused button/link (share, play again, download) handle its own Enter/Space.
  if (ended && e.target instanceof Element && e.target.closest('button, a')) return true;
  if (ended && game.endShown && (e.code === 'Enter' || action === 'jump') && !e.repeat) {
    e.preventDefault();
    playAgain();
    return true;
  }
  return false;
}

input = new Input({
  touchRoot: document.getElementById('touch'),
  isTouchEnabled: () => game.state === 'play' && !game.paused,
  isIgnoredTarget: (target) => muteButton.contains(target) || screens.isPauseControl(target),
  onKey: handleKey,
});
if (prefersTouchControls()) input.enableTouchUI();

// Lift touch buttons above any foreign overlay (host badges such as Netlify's), host-agnostic.
overlayGuard = new OverlayGuard({
  touchRoot: document.getElementById('touch'),
  onChange: () => input.layout(),
});
overlayGuard.start();

const renderer = new Renderer(display, head);

screens.onStart(startGame);
screens.onPlayAgain(playAgain);
screens.onShare(() => shareFlow.share());
screens.onPauseToggle(togglePause);
blockBrowserGestures();

screens.setVersion(VERSION);
if (needsHomeScreenHint()) screens.showHomeScreenHint();

// iOS only resumes audio on some gestures (touchend/click, not pointerdown), so try them all.
for (const type of ['pointerdown', 'touchend', 'click']) {
  window.addEventListener(type, () => {
    if (!game.paused) audio.resume();
  });
}
document.addEventListener('visibilitychange', () => {
  // Leaving the tab/app pauses the game; coming back keeps it paused until the player resumes.
  if (document.hidden) {
    if (game.state === 'play') setPaused(true);
    audio.suspend();
  } else if (!game.paused) {
    audio.resume();
  }
});

// Pause/mute are fixed DOM buttons; the HUD timer moves left of whatever part they cover.
function measureHudInset() {
  display.measureHudInsetRight([document.getElementById('pause'), document.getElementById('mute')]);
}

function resize() {
  display.resize();
  measureHudInset();
  input.layout();
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 250));
if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);

// Test hook, only with ?debug in the URL (used by automated playthroughs).
if (/[?&]debug\b/.test(location.search)) {
  window.__dd = {
    get state() { return game.state; },
    get player() { return game.world.player; },
    get coins() { return game.world.coinCount; },
    get lives() { return game.world.lives; },
    get super() { return game.world.super; },
    get freeze() { return game.freeze; },
    get paused() { return game.paused; },
    get time() { return game.playFrames * TIMESTEP; },
    get audioState() { return audio.ctx ? audio.ctx.state : null; },
    suspendAudio: () => audio.suspend(),
    get hudInsetRight() { return display.hudInsetRight; },
    timerBox: () => timerBox(display.width, display.hudInsetRight),
    get world() { return game.world; },
    get result() { return game.result; },
    get shareFile() { return shareFlow.file; },
    flagX: level.flagX,
    groundAt: (x) => level.terrain.groundAt(x),
    teleport: (x) => game.teleport(x, display.width),
  };
}

console.info(`%c🎂 David Dash — un regalo de ${AUTHOR.NAME} para David`, 'font-weight:bold;color:#c08a10');

// Fixed 60 Hz simulation, rendering once per animation frame.
let last = performance.now();
let accumulator = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(Math.max((now - last) / 1000, 0), 0.25);
  last = now;
  accumulator += dt;
  const paused = portraitQuery.matches;
  while (accumulator >= TIMESTEP) {
    if (!paused) game.update(input, display.width);
    accumulator -= TIMESTEP;
  }
  renderer.render(game);
}

resize();
game.reset(display.width);
requestAnimationFrame(frame);
registerServiceWorker();
