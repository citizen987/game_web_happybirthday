import { storage } from '../utils/storage.js';

/**
 * Persists the best total in this browser. `isNewBest` is only true when a
 * previous record existed and was beaten (the first win is not announced as a record).
 */
export function submitBestScore(key, total) {
  const previous = Number(storage.get(key)) || 0;
  if (total > previous) storage.set(key, String(total));
  return { best: Math.max(previous, total), previous, isNewBest: previous > 0 && total > previous };
}
