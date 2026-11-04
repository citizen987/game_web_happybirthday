// DOM overlays: title screen, victory screen, and the body[data-state] flag
// that CSS uses to show/hide touch controls per game state.
export class Screens {
  constructor(doc = document) {
    this.body = doc.body;
    this.startEl = doc.getElementById('start');
    this.winEl = doc.getElementById('win');
    this.messageEl = doc.getElementById('congrats');
    this.againEl = doc.getElementById('again');
  }

  setState(state) {
    this.body.dataset.state = state;
  }

  // Several event types because iOS only unlocks audio on some gestures.
  onStart(handler) {
    for (const type of ['pointerup', 'touchend', 'click']) this.startEl.addEventListener(type, handler);
  }

  onPlayAgain(handler) {
    this.againEl.addEventListener('click', handler);
  }

  hideStart() {
    this.startEl.classList.add('hidden');
  }

  // Each letter is its own span so CSS can animate a wave with staggered delays.
  showWin(message) {
    this.messageEl.textContent = '';
    Array.from(message).forEach((ch, i) => {
      const span = document.createElement('span');
      span.textContent = ch === ' ' ? ' ' : ch;
      span.style.animationDelay = `${i * 0.06}s, ${i * 0.1}s`;
      this.messageEl.appendChild(span);
    });
    this.winEl.classList.remove('hidden');
  }

  hideWin() {
    this.winEl.classList.add('hidden');
  }
}
