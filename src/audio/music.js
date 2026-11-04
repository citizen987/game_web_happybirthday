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

// "Happy Birthday to You" (public-domain melody), 3/4. [midi note, beats]; played once on victory.
export const BIRTHDAY_SONG = {
  bpm: 118,
  pickupBeats: 1,
  melody: [
    [67, 0.75], [67, 0.25],
    [69, 1], [67, 1], [72, 1],
    [71, 2], [67, 0.75], [67, 0.25],
    [69, 1], [67, 1], [74, 1],
    [72, 2], [67, 0.75], [67, 0.25],
    [79, 1], [76, 1], [72, 1],
    [71, 1], [69, 1], [77, 0.75], [77, 0.25],
    [76, 1], [72, 1], [74, 1],
    [72, 3],
  ],
  // One root per 3-beat bar after the pickup: C G G C C F G C
  bassRoots: [48, 43, 43, 48, 48, 41, 43, 48],
};

// Pause after the goal fanfare before the birthday song starts (s).
const VICTORY_SONG_DELAY = 1.8;

const LOOKAHEAD_S = 0.12;
const SCHEDULER_MS = 25;

// Lookahead scheduler: a timer queues notes slightly ahead of the audio clock.
export class MusicPlayer {
  constructor(audio, track = MAIN_THEME) {
    this.audio = audio;
    this.track = track;
    this.stepDur = 60 / track.bpm / 2;
    this.transpose = 0;
    this.songBus = null;
    this.timer = null;
    this.nextTime = 0;
    this.step = 0;
  }

  /**
   * @param {{bpm?: number, transpose?: number}} [variant] e.g. the faster, higher "super" version;
   *   omitted = the track as written.
   */
  start({ bpm = this.track.bpm, transpose = 0 } = {}) {
    if (!this.audio.ready) return;
    this.stop();
    this.stepDur = 60 / bpm / 2;
    this.transpose = transpose;
    this.step = 0;
    this.nextTime = this.audio.now + 0.1;
    this.timer = setInterval(() => this.schedule(), SCHEDULER_MS);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.stopSong();
  }

  // Birthday song after the goal fanfare.
  playVictory() {
    this.playOnce(BIRTHDAY_SONG, VICTORY_SONG_DELAY);
  }

  /**
   * Schedules a whole one-shot song on its own gain node, so stop() can silence it
   * even though every note was queued in advance.
   */
  playOnce(song, delay = 0) {
    if (!this.audio.ready) return;
    this.stopSong();
    const audio = this.audio;
    const bus = audio.ctx.createGain();
    bus.connect(audio.musicBus);
    this.songBus = bus;
    const beat = 60 / song.bpm;
    const start = audio.now + delay;

    let t = start;
    for (const [note, beats] of song.melody) {
      audio.tone(t, midiToFreq(note), null, beats * beat * 0.92, 'square', 0.2, bus);
      audio.tone(t, midiToFreq(note + 12), null, Math.min(beats * beat, 0.35), 'triangle', 0.06, bus);
      t += beats * beat;
    }
    let tb = start + song.pickupBeats * beat;
    for (const root of song.bassRoots) {
      audio.tone(tb, midiToFreq(root), null, beat * 0.9, 'triangle', 0.32, bus);
      audio.tone(tb + beat, midiToFreq(root + 7), null, beat * 0.8, 'triangle', 0.22, bus);
      audio.tone(tb + 2 * beat, midiToFreq(root + 12), null, beat * 0.8, 'triangle', 0.22, bus);
      tb += 3 * beat;
    }
  }

  stopSong() {
    if (!this.songBus) return;
    this.songBus.gain.setValueAtTime(0, this.audio.now);
    this.songBus.disconnect();
    this.songBus = null;
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
      audio.tone(at, midiToFreq(note + this.transpose), null, this.stepDur * hold, 'square', 0.12, bus);
    }
    const root = bassRoots[Math.floor(step / 8)];
    audio.tone(at, midiToFreq(root + bassPattern[step % 8]), null, this.stepDur * 0.9, 'triangle', 0.3, bus);
    if (step % 4 === 0) audio.tone(at, 160, 45, 0.1, 'triangle', 0.35, bus);
    if (step % 8 === 4) audio.noise(at, 0.08, 0.12, 2200, 'bandpass', bus);
    if (step % 2 === 1) audio.noise(at, 0.03, 0.05, 7000, 'highpass', bus);
  }
}
