import { type Voice } from './voices';

const MASTER_GAIN = 0.45;
const COMPRESSOR_THRESHOLD_DB = -18;
const COMPRESSOR_KNEE_DB = 10;
const COMPRESSOR_RATIO = 8;
const COMPRESSOR_ATTACK_SECONDS = 0.005;
const COMPRESSOR_RELEASE_SECONDS = 0.2;
const MUTE_FADE_SECONDS = 0.02;

export class SoundBoard {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private isMuted: boolean;
  private readonly createContext: () => AudioContext;

  constructor(options: { createContext?: () => AudioContext; muted?: boolean } = {}) {
    this.createContext = options.createContext ?? (() => new AudioContext());
    this.isMuted = options.muted ?? false;
  }

  // Must be called from a keypress, not scene creation: a context built before
  // the user interacts is born `suspended`.
  unlock(): void {
    if (this.context === null) {
      this.context = this.createContext();
      this.buildOutput(this.context);
      return;
    }

    this.resumeIfStopped();
  }

  resumeIfStopped(): void {
    const context = this.context;
    if (context === null || context.state === 'running' || context.state === 'closed') {
      return;
    }

    void context.resume();
  }

  private buildOutput(context: AudioContext): void {
    const master = context.createGain();
    master.gain.value = this.isMuted ? 0 : MASTER_GAIN;
    this.master = master;

    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = COMPRESSOR_THRESHOLD_DB;
    compressor.knee.value = COMPRESSOR_KNEE_DB;
    compressor.ratio.value = COMPRESSOR_RATIO;
    compressor.attack.value = COMPRESSOR_ATTACK_SECONDS;
    compressor.release.value = COMPRESSOR_RELEASE_SECONDS;

    master.connect(compressor);
    compressor.connect(context.destination);
  }

  play(voice: Voice): void {
    const context = this.context;
    const master = this.master;
    if (this.isMuted || context === null || master === null || context.state !== 'running') {
      return;
    }

    const startAt = context.currentTime + voice.delay / 1000;
    const endAt = startAt + voice.duration / 1000;

    const oscillator = context.createOscillator();
    oscillator.type = voice.waveform;
    oscillator.frequency.setValueAtTime(voice.startFrequency, startAt);
    if (voice.endFrequency !== voice.startFrequency) {
      oscillator.frequency.exponentialRampToValueAtTime(voice.endFrequency, endAt);
    }

    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0, startAt);
    envelope.gain.linearRampToValueAtTime(voice.gain, startAt + 0.005);
    envelope.gain.exponentialRampToValueAtTime(0.0001, endAt);

    oscillator.connect(envelope);

    if (voice.pan) {
      const panner = context.createStereoPanner();
      panner.pan.setValueAtTime(Math.max(-1, Math.min(1, voice.pan)), startAt);
      envelope.connect(panner);
      panner.connect(master);
    } else {
      envelope.connect(master);
    }

    oscillator.start(startAt);
    oscillator.stop(endAt);
  }

  get muted(): boolean {
    return this.isMuted;
  }

  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.master !== null && this.context !== null) {
      this.master.gain.setTargetAtTime(
        this.isMuted ? 0 : MASTER_GAIN,
        this.context.currentTime,
        MUTE_FADE_SECONDS,
      );
    }
    return this.isMuted;
  }

  playAll(voices: Voice[]): void {
    for (const voice of voices) {
      this.play(voice);
    }
  }
}
