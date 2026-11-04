import { midiToFreq } from '../core/audio.js';

// Each key matches a game event name emitted by the game layer.
export function createSfx(audio) {
  const play = (fn) => () => {
    if (audio.ready) fn(audio.now);
  };

  return {
    jump: play((t) => audio.tone(t, 280, 660, 0.14, 'square', 0.16)),

    coin: play((t) => {
      audio.tone(t, 988, null, 0.07, 'square', 0.13);
      audio.tone(t + 0.07, 1319, null, 0.22, 'square', 0.13);
    }),

    stomp: play((t) => {
      audio.tone(t, 520, 120, 0.14, 'square', 0.2);
      audio.noise(t, 0.08, 0.2, 1200, 'lowpass');
    }),

    hit: play((t) => {
      audio.tone(t, 440, 70, 0.4, 'sawtooth', 0.2);
      audio.noise(t, 0.25, 0.25, 900, 'lowpass');
    }),

    fall: play((t) => audio.tone(t, 900, 110, 0.55, 'square', 0.14)),

    checkpoint: play((t) => {
      [660, 880, 1320].forEach((f, i) => audio.tone(t + i * 0.08, f, null, 0.16, 'triangle', 0.25));
    }),

    goal: play((t) => {
      const fanfare = [[72, 0.12], [76, 0.12], [79, 0.12], [84, 0.3], [79, 0.12], [84, 0.12], [88, 0.7]];
      let at = t;
      for (const [note, dur] of fanfare) {
        audio.tone(at, midiToFreq(note), null, dur * 0.95, 'square', 0.14);
        audio.tone(at, midiToFreq(note - 12), null, dur * 0.95, 'triangle', 0.2);
        at += dur;
      }
    }),

    firework: play((t) => {
      audio.tone(t, 900, 200, 0.25, 'triangle', 0.08);
      audio.noise(t + 0.2, 0.45, 0.25, 1400, 'lowpass');
    }),
  };
}
