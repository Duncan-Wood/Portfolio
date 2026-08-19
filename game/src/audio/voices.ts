/*
 * What each sound IS, with no idea how to make one.
 *
 * Every voice here is plain data — a waveform, a pitch sweep, a length, a
 * volume. Nothing in this file touches `AudioContext`, so the decisions that
 * carry the feel (does the chain escalate? does a long drop hit harder?) are
 * ordinary unit tests rather than something you can only judge by ear.
 *
 * `sound-board.ts` is the half that knows how to play one.
 */

export type Waveform = 'sine' | 'square' | 'sawtooth' | 'triangle';

/** One note: sweep from `startFrequency` to `endFrequency` over `duration` ms. */
export interface Voice {
  waveform: Waveform;
  startFrequency: number;
  endFrequency: number;
  duration: number;
  gain: number;
  /** Milliseconds to wait before this voice starts, for arpeggios. */
  delay: number;
}

/** A4. The pitch the first link of every chain pops at. */
export const BASE_POP_FREQUENCY = 440;

/**
 * How much higher each further link pops. Roughly a semitone, so a chain walks
 * up a scale rather than jumping — the escalation should feel like counting,
 * not like an alarm.
 */
export const POP_RATIO = 1.06;

/**
 * Two octaves above the base, where the climb stops.
 *
 * Chains have no theoretical ceiling. Without a cap a long enough one walks out
 * of the hearing range, which would make the payoff quieter the better you play.
 */
export const MAX_POP_FREQUENCY = BASE_POP_FREQUENCY * 4;

/** A group vanishing. `linkIndex` is 0-based, so the first link pops at A4. */
export function popVoice(linkIndex: number): Voice {
  const climbed = BASE_POP_FREQUENCY * POP_RATIO ** linkIndex;
  const frequency = Math.min(climbed, MAX_POP_FREQUENCY);

  return {
    waveform: 'square',
    startFrequency: frequency,
    endFrequency: frequency * 1.5,
    duration: 70,
    gain: 0.16,
    delay: 0,
  };
}

/** A pair settling onto the stack. Low and short, so it never competes. */
export function landVoice(): Voice {
  return {
    waveform: 'sine',
    startFrequency: 180,
    endFrequency: 120,
    duration: 60,
    gain: 0.12,
    delay: 0,
  };
}

/**
 * A slam. Louder and lower the further it fell, because the scene scales its
 * screen shake the same way and the two should agree about how hard that was.
 */
export function hardDropVoice(distance: number): Voice {
  const weight = Math.min(distance, 12) / 12;

  return {
    waveform: 'sawtooth',
    startFrequency: 200 - 60 * weight,
    endFrequency: 50,
    duration: 80 + 40 * weight,
    gain: 0.1 + 0.14 * weight,
    delay: 0,
  };
}

/** The board filling up. A long fall, so it reads as a loss. */
export function topOutVoice(): Voice {
  return {
    waveform: 'sawtooth',
    startFrequency: 200,
    endFrequency: 50,
    duration: 400,
    gain: 0.2,
    delay: 0,
  };
}

/**
 * The flourish after a real chain resolves: an ascending arpeggio, one note per
 * link, played over the top of the pops that already happened.
 *
 * Silent for a single link, because every clear is technically a one-link chain
 * and congratulating those would make the flourish meaningless — the same rule
 * the "N CHAIN" callout already follows.
 */
export function chainVoices(chainLength: number): Voice[] {
  if (chainLength < 2) {
    return [];
  }

  const steps = [1, 4 / 3, 3 / 2, 2, 7 / 3, 3];
  const notes = Math.min(chainLength, steps.length);

  return Array.from({ length: notes }, (_unused, index): Voice => {
    const frequency = 660 * steps[index];
    return {
      waveform: 'triangle',
      startFrequency: frequency,
      endFrequency: frequency,
      duration: 90,
      gain: 0.13,
      delay: index * 50,
    };
  });
}
