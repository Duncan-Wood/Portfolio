import { type Voice } from './voices';

/*
 * The half of the audio that touches the browser: it owns one `AudioContext`
 * and turns a `Voice` into an oscillator with a volume envelope.
 *
 * Deliberately thin and deliberately untested. Everything that decides how the
 * game SOUNDS lives in `voices.ts`, which is plain data and fully unit-tested;
 * what is left here is the part a unit test could only assert by re-describing
 * the Web Audio API back to itself.
 *
 * Synthesised rather than loaded from files: the game ships no audio assets, no
 * loader step and no licences, and a pitch that rises per chain link is one
 * multiplication rather than a folder of pre-rendered variants.
 */
export class SoundBoard {
  private context: AudioContext | null = null;

  /**
   * Browsers refuse to start audio until the user has interacted with the page,
   * and a context created before that is born `suspended`. So this is called
   * from the first keypress rather than from scene creation — build it too
   * early and the game is silent until something unrelated happens to click.
   *
   * Safe to call on every keypress; it only acts when there is something to do.
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
      // Exponential rather than linear, because pitch is perceived
      // logarithmically — a linear sweep sounds like it slows down at the top.
      oscillator.frequency.exponentialRampToValueAtTime(voice.endFrequency, endAt);
    }

    // A 5ms fade in and a ramp to silence. Starting or stopping an oscillator
    // at full volume produces an audible click, which reads as a bug rather
    // than as percussion.
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0, startAt);
    envelope.gain.linearRampToValueAtTime(voice.gain, startAt + 0.005);
    envelope.gain.exponentialRampToValueAtTime(0.0001, endAt);

    oscillator.connect(envelope);

    // Placed in the stereo field only when a voice asks for it, so the node
    // graph for the nine voices that do not is exactly what it always was.
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
