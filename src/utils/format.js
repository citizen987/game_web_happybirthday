// Thousands separated with dots (Spanish style), also for 4-digit numbers: 4250 -> "4.250".
export const formatPoints = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

// Whole seconds as m:ss -> 74.6 -> "1:14".
export function formatTime(seconds) {
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
