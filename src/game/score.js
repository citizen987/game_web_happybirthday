import { SCORE, TIMESTEP } from '../config.js';

/**
 * Final score from coins held at the flag and play time (fixed-step frames,
 * so pauses and display refresh rate do not affect it).
 */
export function computeScore({ coins, frames, totalCoins }) {
  const seconds = frames * TIMESTEP;
  const coinPoints = coins * SCORE.COIN_POINTS;
  const timeBonus = Math.max(0, SCORE.PAR_SECONDS - Math.floor(seconds)) * SCORE.TIME_BONUS_PER_SECOND;
  return { coins, totalCoins, seconds, coinPoints, timeBonus, total: coinPoints + timeBonus };
}
