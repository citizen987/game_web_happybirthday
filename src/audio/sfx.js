import { midiToFreq } from '../core/audio.js';

// Each key matches a game event name emitted by the game layer.
export function createSfx(audio) {
  const play = (fn) => (arg) => {
    if (audio.ready) fn(audio.now, arg);
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

    roll: play((t) => {
      audio.tone(t, 420, 180, 0.12, 'square', 0.12);
      audio.noise(t, 0.12, 0.12, 1800, 'bandpass');
    }),

    // level: 0..1 charge, the rev climbs in pitch with every press.
    charge: play((t, level = 0) => {
      const f = 300 + level * 600;
      audio.tone(t, f, f * 2.2, 0.16, 'sawtooth', 0.1);
      audio.noise(t, 0.1, 0.1, 2500 + level * 3000, 'highpass');
    }),

    release: play((t) => {
      audio.tone(t, 180, 1100, 0.28, 'sawtooth', 0.14);
      audio.noise(t, 0.3, 0.2, 1200, 'lowpass');
    }),

    die: play((t) => {
      audio.tone(t, 520, 780, 0.12, 'square', 0.16);
      audio.tone(t + 0.14, 700, 90, 0.6, 'square', 0.15);
    }),

    // Light-hearted, not sad: the congratulation still comes after it.
    gameover: play((t) => {
      const tune = [[79, 0.15], [76, 0.15], [72, 0.15], [74, 0.15], [76, 0.15], [72, 0.5]];
      let at = t;
      for (const [note, dur] of tune) {
        audio.tone(at, midiToFreq(note), null, dur * 0.9, 'triangle', 0.25);
        at += dur;
      }
    }),

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
