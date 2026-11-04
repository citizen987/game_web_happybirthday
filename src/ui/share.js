import { SHARE } from '../config.js';
import { formatPoints, formatTime } from '../utils/format.js';

export const canShareNatively = () => typeof navigator.share === 'function';

// The congratulation comes first; the score is the excuse to share it.
// Without a result (out of lives) the message is a pure congratulation.
export function buildShareText(result) {
  if (!result) {
    return `🎂 ¡Feliz cumpleaños, David! Te he felicitado jugando a David Dash, `
      + `el juego de tu cumpleaños. ¿Llegarás tú a la meta? 👉 ${SHARE.URL}`;
  }
  return `🎂 ¡Feliz cumpleaños, David! Te he felicitado corriendo en David Dash: `
    + `${formatPoints(result.total)} puntos (${result.coins} monedas en ${formatTime(result.seconds)}). `
    + `¿Quién se anima a superarlo? 👉 ${SHARE.URL}`;
}

/**
 * Opens the OS share sheet (Android/iOS/supported desktops) with text and, when
 * the platform accepts files, the card image. Otherwise copies the text.
 *
 * navigator.share must run inside the tap's user activation, so it is called
 * before any await: the card File has to be generated beforehand.
 *
 * @returns {Promise<'shared'|'cancelled'|'copied'|'unavailable'>}
 */
export async function shareCongrats({ text, file }) {
  if (canShareNatively()) {
    const data = { title: SHARE.TITLE, text };
    if (file && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
      data.files = [file];
    }
    try {
      await navigator.share(data);
      return 'shared';
    } catch (err) {
      if (err && err.name === 'AbortError') return 'cancelled';
      console.warn('Native share failed, falling back to clipboard', err);
    }
  }
  return (await copyText(text)) ? 'copied' : 'unavailable';
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.warn('Clipboard write failed', err);
    return false;
  }
}
