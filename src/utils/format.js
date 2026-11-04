// Thousands separated with dots (Spanish style), also for 4-digit numbers: 4250 -> "4.250".
export const formatPoints = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

// Whole seconds as MM:SS -> 74.6 -> "01:14" (HUD timer, score panel, share text and card).
export function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
