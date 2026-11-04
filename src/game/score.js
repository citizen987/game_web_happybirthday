import { LETTERS, SCORE, TIMESTEP } from '../config.js';

/**
 * Final score from coins held at the flag, play time (fixed-step frames, so
 * pauses and refresh rate do not affect it) and the D-A-V-I-D letters.
 * `letters` is one boolean per letter of LETTERS.WORD.
 */
export function computeScore({ coins, frames, totalCoins, letters = [] }) {
  const seconds = frames * TIMESTEP;
  const coinPoints = coins * SCORE.COIN_POINTS;
  const timeBonus = Math.max(0, SCORE.PAR_SECONDS - Math.floor(seconds)) * SCORE.TIME_BONUS_PER_SECOND;
  const letterCount = letters.filter(Boolean).length;
  const wordComplete = letterCount === LETTERS.WORD.length;
  const letterPoints = letterCount * LETTERS.POINTS + (wordComplete ? LETTERS.WORD_BONUS : 0);
  return {
    coins, totalCoins, seconds, coinPoints, timeBonus,
    letters: [...letters], letterCount, wordComplete, letterPoints,
    total: coinPoints + timeBonus + letterPoints,
  };
}
