import { LETTERS } from '../config.js';
import { formatPoints, formatTime } from '../utils/format.js';

const COUNT_UP_DELAY_MS = 1100;
const COUNT_UP_MS = 900;
const TOAST_MS = 2600;
const NBSP = String.fromCharCode(160);
const BANNER_MS = 2300;

// DOM overlays: title screen, end screen (win with score card / gameover without it),
// toast, and the body[data-state] flag that CSS uses to show/hide touch controls.
export class Screens {
  constructor(doc = document) {
    this.body = doc.body;
    this.startEl = doc.getElementById('start');
    this.homeHintEl = doc.getElementById('home-hint');
    this.winEl = doc.getElementById('win');
    this.messageEl = doc.getElementById('congrats');
    this.againEl = doc.getElementById('again');
    this.shareEl = doc.getElementById('share');
    this.downloadEl = doc.getElementById('download');
    this.coinsEl = doc.getElementById('score-coins');
    this.timeEl = doc.getElementById('score-time');
    this.totalEl = doc.getElementById('score-total');
    this.bestEl = doc.getElementById('score-best');
    this.subtitleEl = doc.getElementById('end-subtitle');
    this.toastEl = doc.getElementById('toast');
    this.lettersEl = doc.getElementById('score-letters');
    this.bannerEl = doc.getElementById('banner');
    this.pauseBtn = doc.getElementById('pause');
    this.pauseEl = doc.getElementById('pause-overlay');
    this.resumeEl = doc.getElementById('resume');
    this.bannerTimer = null;
    this.countToken = 0;
    this.toastTimer = null;
    this.downloadUrl = null;
  }

  setState(state) {
    this.body.dataset.state = state;
  }

  // Several event types because iOS only unlocks audio on some gestures.
  onStart(handler) {
    for (const type of ['pointerup', 'touchend', 'click']) this.startEl.addEventListener(type, handler);
  }

  showHomeScreenHint() {
    this.homeHintEl.classList.remove('hidden');
  }

  onPlayAgain(handler) {
    this.againEl.addEventListener('click', handler);
  }

  onPauseToggle(handler) {
    this.pauseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      handler();
    });
    this.resumeEl.addEventListener('click', handler);
  }

  isPauseControl(target) {
    return target instanceof Node && (this.pauseBtn.contains(target) || this.pauseEl.contains(target));
  }

  setPaused(paused) {
    this.pauseEl.classList.toggle('hidden', !paused);
    this.pauseBtn.setAttribute('aria-label', paused ? 'Continuar' : 'Pausa');
  }

  onShare(handler) {
    this.shareEl.addEventListener('click', handler);
  }

  hideStart() {
    this.startEl.classList.add('hidden');
  }

  /**
   * @param {string} message animated headline
   * @param {{coins:number,totalCoins:number,seconds:number,total:number}} result
   * @param {{best:number,isNewBest:boolean}} record
   */
  showWin(message, result, record) {
    this.prepareEnd('win', message, 'Volver a jugar');
    this.timeEl.textContent = formatTime(result.seconds);
    this.bestEl.textContent = record.isNewBest ? '🏆 ¡Nuevo récord!' : `Récord: ${formatPoints(record.best)}`;
    this.bestEl.classList.toggle('is-new', record.isNewBest);
    this.renderLetters(result);
    this.countUp(result);
    this.winEl.classList.remove('hidden');
  }

  // Out of lives: same celebration overlay for David, without the score.
  showGameOver(message, subtitle) {
    this.prepareEnd('gameover', message, 'Intentar de nuevo');
    this.subtitleEl.textContent = subtitle;
    this.countToken++;
    this.winEl.classList.remove('hidden');
  }

  // Big animated headline over the game (Súper David transformation); restarts its CSS animation.
  showBanner(text) {
    this.bannerEl.textContent = text;
    this.bannerEl.classList.add('hidden');
    void this.bannerEl.offsetWidth;
    this.bannerEl.classList.remove('hidden');
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => this.bannerEl.classList.add('hidden'), BANNER_MS);
  }

  hideBanner() {
    clearTimeout(this.bannerTimer);
    this.bannerEl.classList.add('hidden');
  }

  renderLetters(result) {
    this.lettersEl.textContent = '';
    Array.from(LETTERS.WORD).forEach((ch, i) => {
      const span = document.createElement('span');
      span.className = result.letters[i] ? 'letter on' : 'letter';
      span.textContent = ch;
      this.lettersEl.appendChild(span);
    });
    if (result.letterPoints > 0) {
      const pts = document.createElement('span');
      pts.className = 'letters-points';
      pts.textContent = `+${formatPoints(result.letterPoints)}`;
      this.lettersEl.appendChild(pts);
    }
    this.lettersEl.classList.toggle('complete', result.wordComplete);
  }

  hideWin() {
    this.countToken++;
    this.winEl.classList.add('hidden');
    this.setCardDownload(null);
  }

  setShareLabel(native) {
    this.shareEl.textContent = native ? '🎁 Compartir felicitación' : '📋 Copiar felicitación';
  }

  // Desktop fallback: offer the card as a download when the OS share sheet is unavailable.
  setCardDownload(file) {
    if (this.downloadUrl) URL.revokeObjectURL(this.downloadUrl);
    this.downloadUrl = file ? URL.createObjectURL(file) : null;
    if (this.downloadUrl) {
      this.downloadEl.href = this.downloadUrl;
      this.downloadEl.download = file.name;
    } else {
      this.downloadEl.removeAttribute('href');
    }
    this.downloadEl.classList.toggle('hidden', !this.downloadUrl);
  }

  showToast(message) {
    this.toastEl.textContent = message;
    this.toastEl.classList.remove('hidden');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastEl.classList.add('hidden'), TOAST_MS);
  }

  // Shared setup of the end overlay; `mode` drives which parts CSS shows.
  prepareEnd(mode, message, againLabel) {
    this.winEl.dataset.mode = mode;
    this.againEl.textContent = againLabel;
    this.setCardDownload(null);
    // Each letter is its own span so CSS can animate a wave with staggered delays.
    this.messageEl.textContent = '';
    Array.from(message).forEach((ch, i) => {
      const span = document.createElement('span');
      span.textContent = ch === ' ' ? NBSP : ch;
      span.style.animationDelay = `${i * 0.06}s, ${i * 0.1}s`;
      this.messageEl.appendChild(span);
    });
  }

  // Coins and points tick up once the score card has popped in.
  countUp(result) {
    const token = ++this.countToken;
    this.coinsEl.textContent = `0/${result.totalCoins}`;
    this.totalEl.textContent = '0';
    const start = performance.now() + COUNT_UP_DELAY_MS;
    const step = (now) => {
      if (token !== this.countToken) return;
      const k = Math.min(1, Math.max(0, (now - start) / COUNT_UP_MS));
      const ease = 1 - Math.pow(1 - k, 3);
      this.coinsEl.textContent = `${Math.round(result.coins * ease)}/${result.totalCoins}`;
      this.totalEl.textContent = formatPoints(result.total * ease);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
}
