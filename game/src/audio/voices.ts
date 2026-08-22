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
 * One pad on the progress track lighting up.
 *
 * Climbs a full octave across the whole loop, so the pitch alone tells you how
 * close the circuit is to closing — the last pad is an octave above the first.
 */
export function nodeVoice(padIndex: number, padCount: number): Voice {
  const frequency = 330 * 2 ** (padIndex / padCount);

  return {
    waveform: 'triangle',
    startFrequency: frequency,
    endFrequency: frequency * 1.5,
    duration: 110,
    gain: 0.1,
    delay: 0,
  };
}

/**
 * The shadow taking a cell.
 *
 * The lowest, longest thing in the game and the only voice that falls into the
 * bass — every other sound here is an event the player caused, and this is the
 * one that happens TO them. Sawtooth because it has to sound wrong beside four
 * clean waveforms, and quiet because it arrives unprompted: a loud sting for
 * something you cannot answer immediately reads as nagging.
 */
export function shadowArrivalVoice(): Voice {
  return {
    waveform: 'sawtooth',
    startFrequency: 150,
    endFrequency: 62,
    duration: 320,
    gain: 0.12,
    delay: 0,
  };
}

/**
 * Light pushing the shadow back off a cell.
 *
 * The inverse of the arrival — short, high and rising where that one is long,
 * low and falling — so the counter-play is audible as the answer to it. It
 * plays once per link rather than once per cell, with a little more weight
 * behind a clear that pushed back several, because one voice per cell would
 * stack into a chord on top of the pop that caused it.
 */
export function shadowRecedeVoice(cellsPushed: number): Voice {
  const weight = Math.min(cellsPushed, 4) / 4;

  return {
    waveform: 'triangle',
    startFrequency: 880,
    endFrequency: 1320 + 220 * weight,
    duration: 90,
    gain: 0.05 + 0.05 * weight,
    delay: 0,
  };
}

/**
 * One cell of the wave that answering the question sends across the board.
 *
 * Climbs a semitone per cell and is staggered, so a board full of shadow walks
 * up out of the stack rather than landing as one chord — the rarest moment in
 * the game gets the longest sound in it.
 *
 * Louder than a pop on purpose. This happens perhaps twice in a session, and
 * the whole design of the beat is that it is the biggest thing that happens;
 * a payout the same volume as an ordinary clear would say the opposite.
 *
 * The climb caps two octaves up for the same reason `popVoice` does: a long
 * enough wave would otherwise walk out of the hearing range and go quiet
 * exactly when the player earned the most.
 */
export function answerVoice(index: number): Voice {
  const frequency = 330 * 2 ** (Math.min(index, 24) / 12);

  return {
    waveform: 'triangle',
    startFrequency: frequency,
    endFrequency: frequency * 2,
    duration: 170,
    gain: 0.19,
    delay: index * 55,
  };
}

/**
 * One connection going dark as the board is lost.
 *
 * The exact inverse of `answerVoice`, which is what makes the ending read as
 * the answer beat run backwards: that one climbs a semitone a cell as the
 * shadow is driven off, and this one FALLS a semitone a cell as the traces die.
 * Same interval, same stagger, opposite direction.
 */
export function connectionLostVoice(index: number): Voice {
  const frequency = 330 * 2 ** (-Math.min(index, 24) / 12);

  return {
    waveform: 'triangle',
    startFrequency: frequency,
    endFrequency: frequency / 2,
    duration: 200,
    gain: 0.13,
    delay: index * 45,
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
