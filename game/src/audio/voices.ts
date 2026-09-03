/*
 * What each sound IS, with no idea how to make one. Nothing here touches
 * `AudioContext`, so the decisions that carry the feel are unit tests rather
 * than something only judgeable by ear. `sound-board.ts` plays them.
 */

type Waveform = 'sine' | 'square' | 'sawtooth' | 'triangle';

export interface Voice {
  waveform: Waveform;
  startFrequency: number;
  endFrequency: number;
  duration: number;
  gain: number;
  /** For arpeggios. */
  delay: number;
  /** -1 hard left to 1 hard right. Omitted is centred. */
  pan?: number;
}

export const BASE_POP_FREQUENCY = 440;

/** How much higher each further link pops. Roughly a semitone. */
const POP_RATIO = 1.06;

/**
 * Chains have no theoretical ceiling, and an uncapped climb walks out of hearing
 * range exactly when the player has earned the most.
 */
export const MAX_POP_FREQUENCY = BASE_POP_FREQUENCY * 4;

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

/** Louder and lower the further it fell, like the screen shake. */
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

/** A long fall, so it reads as a loss. */
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
 * One node lighting. Climbs a full octave across the set, so pitch alone says
 * how close the board is to solved.
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
 * The only voice in the bass: every other sound is an event the player caused,
 * and this is the one that happens TO them. Sawtooth so it sounds wrong beside
 * four clean waveforms, and quiet because it arrives unprompted.
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
 * The inverse of the arrival — short, high and rising where that one is long,
 * low and falling — so the counter-play is audible as the answer to it.
 *
 * Once per link rather than per cell, or it stacks into a chord over the pop.
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
 * A shadow hit hard enough to hurt and not hard enough to shift. The recede
 * rises because it reports something leaving; this reports something STAYING,
 * so it falls, and a square rather than a triangle makes it a knock rather than
 * a chime. The player has to hear that they connected without hearing they won.
 */
export function shadowStruckVoice(cellsStruck: number): Voice {
  const weight = Math.min(cellsStruck, 4) / 4;

  return {
    waveform: 'square',
    startFrequency: 210 + 40 * weight,
    endFrequency: 120,
    duration: 70,
    gain: 0.05 + 0.03 * weight,
    delay: 0,
  };
}

/**
 * One cell of the wave answering the question sends across the board. Climbs a
 * semitone per cell and staggers, so a board full of shadow walks up out of the
 * stack rather than landing as one chord.
 *
 * Louder than a pop: this happens perhaps twice a session.
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
 * The exact inverse of `answerVoice` — same interval, same stagger, opposite
 * direction — so losing reads as the answer beat run backwards.
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
 * An ascending arpeggio, one note per link, over the pops that already happened.
 * Silent for a single link: every clear is technically a one-link chain.
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
