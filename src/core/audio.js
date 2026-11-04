import { storage } from '../utils/storage.js';

const MASTER_VOLUME = 0.5;
const MUTE_KEY = 'dd-muted';

export const midiToFreq = (note) => 440 * Math.pow(2, (note - 69) / 12);

// Thin WebAudio wrapper: owns the context, mix buses and mute state,
// and exposes two synth primitives (tone and filtered noise).
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicBus = null;
    this.sfxBus = null;
    this.noiseBuffer = null;
    this.muted = storage.get(MUTE_KEY) === '1';
    this.listeners = new Set();
  }

  get ready() {
    return this.ctx !== null;
  }

  get running() {
    return this.ctx !== null && this.ctx.state === 'running';
  }

  get now() {
    return this.ctx.currentTime;
  }

  // Must be called from inside a user gesture (browsers block audio otherwise).
  unlock() {
    if (this.ctx) {
      this.resume();
      return;
    }
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      console.warn('WebAudio is not supported: the game will run without sound');
      return;
    }
    const ctx = new AudioContextClass();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : MASTER_VOLUME;
    this.master.connect(ctx.destination);
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = 0.4;
    this.musicBus.connect(this.master);
    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = 0.8;
    this.sfxBus.connect(this.master);

    this.noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    // iOS unlock: play a silent buffer inside the gesture.
    const silent = ctx.createBufferSource();
    silent.buffer = ctx.createBuffer(1, 1, 22050);
    silent.connect(ctx.destination);
    silent.start(0);
    this.resume();
  }

  resume() {
    if (this.ctx && this.ctx.state !== 'running') this.ctx.resume();
  }

  suspend() {
    if (this.ctx) this.ctx.suspend();
  }

  onChange(listener) {
    this.listeners.add(listener);
  }

  setMuted(muted) {
    this.muted = muted;
    storage.set(MUTE_KEY, muted ? '1' : '0');
    if (this.master) this.master.gain.setTargetAtTime(muted ? 0 : MASTER_VOLUME, this.ctx.currentTime, 0.02);
    for (const listener of this.listeners) listener(muted);
  }

  toggleMute() {
    this.setMuted(!this.muted);
  }

  tone(at, freq, freqEnd, dur, type, vol, bus = this.sfxBus) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, at);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, at + dur);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(vol, at + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(gain);
    gain.connect(bus);
    osc.start(at);
    osc.stop(at + dur + 0.05);
  }

  noise(at, dur, vol, freq, filterType, bus = this.sfxBus) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = freq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(bus);
    src.start(at, Math.random() * 0.5);
    src.stop(at + dur + 0.05);
  }
}
