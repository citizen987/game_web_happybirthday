import { LIVES, SCORE, WIN } from '../config.js';
import { submitBestScore } from '../core/best-score.js';
import { createShareCard } from '../render/share-card.js';
import { buildShareText, canShareNatively, shareCongrats } from './share.js';

/**
 * End-of-game flow: shows the end overlay (win with score / gameover without),
 * pre-generates the share card and handles the share button.
 *
 * The PNG is generated when the overlay appears (not on tap) because
 * navigator.share must be called synchronously inside the tap gesture on iOS.
 */
export class ShareFlow {
  constructor({ screens, head }) {
    this.screens = screens;
    this.head = head;
    this.file = null;
    this.result = null;
    this.ready = false;
    this.token = 0;
  }

  showWin(result) {
    const record = submitBestScore(SCORE.BEST_KEY, result.total);
    this.screens.setShareLabel(canShareNatively());
    this.screens.showWin(WIN.MESSAGE, result, record);
    this.prepare(result);
  }

  // Out of lives: no score and no record, but David is still congratulated and it can be shared.
  showGameOver() {
    this.screens.setShareLabel(canShareNatively());
    this.screens.showGameOver(WIN.MESSAGE, LIVES.GAMEOVER_SUBTITLE);
    this.prepare(null);
  }

  // Forget the current card (restart). Late card renders from the old run are discarded.
  reset() {
    this.token++;
    this.file = null;
    this.result = null;
    this.ready = false;
  }

  async share() {
    if (!this.ready) return;
    const outcome = await shareCongrats({ text: buildShareText(this.result), file: this.file });
    if (outcome === 'copied') this.screens.showToast('¡Felicitación copiada! Pégala donde quieras 📋');
    else if (outcome === 'unavailable') this.screens.showToast('Este navegador no permite compartir 😕');
  }

  prepare(result) {
    this.reset();
    this.result = result;
    this.ready = true;
    const token = this.token;
    createShareCard({ headImage: this.head.image, result })
      .then((file) => {
        if (token !== this.token) return;
        this.file = file;
        if (!canShareNatively()) this.screens.setCardDownload(file);
      })
      .catch((err) => console.warn('Share card could not be generated; sharing text only', err));
  }
}
