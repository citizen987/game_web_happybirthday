export const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);

export const rand = (min, max) => min + Math.random() * (max - min);

export const approach = (v, target, step) =>
  v < target ? Math.min(v + step, target) : Math.max(v - step, target);

export const pick = (items) => items[Math.floor(Math.random() * items.length)];

// Small deterministic PRNG so decoration and clouds look identical every run.
export function mulberry32(seed) {
  let a = seed;
  return function next() {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
