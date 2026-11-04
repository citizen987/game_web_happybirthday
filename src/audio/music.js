import { midiToFreq } from '../core/audio.js';

// Original chiptune loop (C - Am - F - G), one entry per eighth note. 0 = rest.
export const MAIN_THEME = {
  bpm: 150,
  melody: [
    72, 0, 76, 79, 0, 79, 77, 76,
    76, 0, 72, 69, 0, 72, 74, 76,
    77, 0, 77, 81, 0, 79, 77, 76,
    74, 0, 74, 79, 0, 77, 76, 74,
    72, 0, 76, 79, 0, 84, 83, 81,
    79, 0, 76, 72, 0, 76, 77, 79,
    81, 79, 77, 76, 74, 76, 77, 74,
    79, 77, 76, 74, 71, 0, 67, 0,
  ],
  bassRoots: [48, 45, 41, 43, 48, 45, 41, 43],
  bassPattern: [0, 12, 7, 12, 0, 12, 7, 12],
};

const LOOKAHEAD_S = 0.12;
const SCHEDULER_MS = 25;

// Lookahead scheduler: a timer queues notes slightly ahead of the audio clock.
export class MusicPlayer {
  constructor(audio, track = MAIN_THEME) {
    this.audio = audio;
    this.track = track;
    this.stepDur = 60 / track.bpm / 2;
    this.timer = null;
    this.nextTime = 0;
    this.step = 0;
  }

  start() {
    if (!this.audio.ready) return;
    this.stop();
    this.step = 0;
    this.nextTime = this.audio.now + 0.1;
    this.timer = setInterval(() => this.schedule(), SCHEDULER_MS);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  schedule() {
    const audio = this.audio;
    if (!audio.running) return;
    // After a throttled tab the clock may be far ahead: skip instead of bursting notes.
    if (this.nextTime < audio.now - 0.2) this.nextTime = audio.now + 0.05;
    while (this.nextTime < audio.now + LOOKAHEAD_S) {
      this.playStep(this.step, this.nextTime);
      this.nextTime += this.stepDur;
      this.step = (this.step + 1) % this.track.melody.length;
    }
  }

  playStep(step, at) {
    const { melody, bassRoots, bassPattern } = this.track;
    const audio = this.audio;
    const bus = audio.musicBus;
    const note = melody[step];
    if (note) {
      const hold = melody[(step + 1) % melody.length] === 0 ? 1.8 : 0.85;
      audio.tone(at, midiToFreq(note), null, this.stepDur * hold, 'square', 0.12, bus);
    }
    const root = bassRoots[Math.floor(step / 8)];
    audio.tone(at, midiToFreq(root + bassPattern[step % 8]), null, this.stepDur * 0.9, 'triangle', 0.3, bus);
    if (step % 4 === 0) audio.tone(at, 160, 45, 0.1, 'triangle', 0.35, bus);
    if (step % 8 === 4) audio.noise(at, 0.08, 0.12, 2200, 'bandpass', bus);
    if (step % 2 === 1) audio.noise(at, 0.03, 0.05, 7000, 'highpass', bus);
  }
}
