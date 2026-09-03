import { type Voice } from './voices';

export class SoundBoard {
  private context: AudioContext | null = null;

  /**
   * Called from the first keypress, not from scene creation: browsers refuse to
   * start audio before the user interacts, and a context built earlier is born
   * `suspended`. Safe to call on every keypress.
   */
  unlock(): void {
    if (this.context === null) {
      this.context = new AudioContext();
      return;
    }

    if (this.context.state === 'suspended') {
      void this.context.resume();
    }
  }

  play(voice: Voice): void {
    const context = this.context;
    if (context === null || context.state !== 'running') {
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

    // Starting or stopping an oscillator at full volume clicks audibly.
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0, startAt);
    envelope.gain.linearRampToValueAtTime(voice.gain, startAt + 0.005);
    envelope.gain.exponentialRampToValueAtTime(0.0001, endAt);

    oscillator.connect(envelope);

    if (voice.pan) {
      const panner = context.createStereoPanner();
      panner.pan.setValueAtTime(Math.max(-1, Math.min(1, voice.pan)), startAt);
      envelope.connect(panner);
      panner.connect(context.destination);
    } else {
      envelope.connect(context.destination);
    }

    oscillator.start(startAt);
    oscillator.stop(endAt);
  }

  playAll(voices: Voice[]): void {
    for (const voice of voices) {
      this.play(voice);
    }
  }
}
