import { type Voice } from './voices';
import { frequencyOf } from './memory-themes';

export const AMBIENT_GAP_MS = 3600;

const SCALE = ['A3', 'C4', 'D4', 'E4', 'G4', 'A4', 'C5'].map(frequencyOf);
const SECOND_VOICE_AT = 5;
const STEP_STRIDE = 5;

export interface AmbientClock {
  elapsed: number;
  step: number;
}

export const STILL_AMBIENT: AmbientClock = { elapsed: 0, step: 0 };

export function ambientVoices(step: number, found: number): Voice[] {
  const pitch = SCALE[(step * STEP_STRIDE + Math.floor(step / SCALE.length)) % SCALE.length];
  const voices: Voice[] = [{
    waveform: 'sine',
    startFrequency: pitch,
    endFrequency: pitch,
    duration: 3200,
    gain: 0.05,
    delay: 0,
  }];

  if (found >= SECOND_VOICE_AT) {
    voices.push({
      waveform: 'sine',
      startFrequency: pitch * 1.5,
      endFrequency: pitch * 1.5,
      duration: 3000,
      gain: 0.025,
      delay: 160,
    });
  }

  return voices;
}

export function ambientAfter(
  clock: AmbientClock,
  delta: number,
  found: number,
): { clock: AmbientClock; voices: Voice[] } {
  const elapsed = clock.elapsed + delta;
  if (elapsed < AMBIENT_GAP_MS) {
    return { clock: { elapsed, step: clock.step }, voices: [] };
  }

  return {
    clock: { elapsed: elapsed % AMBIENT_GAP_MS, step: clock.step + 1 },
    voices: ambientVoices(clock.step, found),
  };
}
