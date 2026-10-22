import { type Voice } from './voices';

const MASTER_GAIN = 0.45;
const COMPRESSOR_THRESHOLD_DB = -18;
const COMPRESSOR_KNEE_DB = 10;
const COMPRESSOR_RATIO = 8;
const COMPRESSOR_ATTACK_SECONDS = 0.005;
const COMPRESSOR_RELEASE_SECONDS = 0.2;

export class SoundBoard {
  private context: AudioContext | null = null;
  private output: AudioNode | null = null;
  private musicOn = true;

  constructor(private readonly createContext: () => AudioContext = () => new AudioContext()) {}

  // Must be called from a keypress, not scene creation: a context built before
  // the user interacts is born `suspended`.
  unlock(): void {
    if (this.context === null) {
      this.context = this.createContext();
      this.output = this.buildOutput(this.context);
      return;
    }

    if (this.context.state === 'suspended') {
      void this.context.resume();
    }
  }

  private buildOutput(context: AudioContext): AudioNode {
    const master = context.createGain();
    master.gain.value = MASTER_GAIN;

    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = COMPRESSOR_THRESHOLD_DB;
    compressor.knee.value = COMPRESSOR_KNEE_DB;
    compressor.ratio.value = COMPRESSOR_RATIO;
    compressor.attack.value = COMPRESSOR_ATTACK_SECONDS;
    compressor.release.value = COMPRESSOR_RELEASE_SECONDS;

    master.connect(compressor);
    compressor.connect(context.destination);
    return master;
  }

  play(voice: Voice): void {
    const context = this.context;
    const output = this.output;
    if (context === null || output === null || context.state !== 'running') {
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
      panner.connect(output);
    } else {
      envelope.connect(output);
    }

    oscillator.start(startAt);
    oscillator.stop(endAt);
  }

  get musicPlaying(): boolean {
    return this.musicOn;
  }

  toggleMusic(): boolean {
    this.musicOn = !this.musicOn;
    return this.musicOn;
  }

  playMusic(voices: Voice[]): void {
    if (this.musicOn) {
      this.playAll(voices);
    }
  }

  playAll(voices: Voice[]): void {
    for (const voice of voices) {
      this.play(voice);
    }
  }
}
