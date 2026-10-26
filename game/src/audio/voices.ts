export type Waveform = 'sine' | 'square' | 'sawtooth' | 'triangle';

export interface Voice {
  waveform: Waveform;
  startFrequency: number;
  endFrequency: number;
  duration: number;
  gain: number;
  delay: number;
  pan?: number;
}

export const BASE_POP_FREQUENCY = 440;

const POP_RATIO = 1.06;

export const MAX_POP_FREQUENCY = BASE_POP_FREQUENCY * 4;

const COLOUR_SEMITONES = [0, 3, 5, 7];

export function popVoice(linkIndex: number, pieceType: number): Voice {
  const semitones = COLOUR_SEMITONES[pieceType];
  if (semitones === undefined) {
    throw new RangeError(`Piece type ${pieceType} is not a colour, so it has no pop pitch`);
  }

  const climbed = BASE_POP_FREQUENCY * 2 ** (semitones / 12) * POP_RATIO ** linkIndex;
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
    waveform: 'sawtooth',
    startFrequency: 190,
    endFrequency: 90,
    duration: 90,
    gain: 0.09,
    delay: 0,
  };
}

export function hardDropVoice(distance: number): Voice {
  const weight = Math.min(distance, 12) / 12;

  return {
    waveform: 'sawtooth',
    startFrequency: 200 - 60 * weight,
    endFrequency: 80,
    duration: 80 + 40 * weight,
    gain: 0.07 + 0.08 * weight,
    delay: 0,
  };
}

export function topOutVoice(): Voice {
  return {
    waveform: 'sawtooth',
    startFrequency: 200,
    endFrequency: 50,
    duration: 400,
    gain: 0.28,
    delay: 0,
  };
}

export function nodeVoice(padIndex: number, padCount: number): Voice {
  const frequency = 330 * 2 ** (padIndex / Math.max(padCount - 1, 1));

  return {
    waveform: 'triangle',
    startFrequency: frequency,
    endFrequency: frequency * 1.5,
    duration: 110,
    gain: 0.14,
    delay: 0,
  };
}

export function shadowArrivalVoices(): Voice[] {
  return [
    {
      waveform: 'sawtooth',
      startFrequency: 233,
      endFrequency: 233,
      duration: 160,
      gain: 0.16,
      delay: 0,
    },
    {
      waveform: 'sawtooth',
      startFrequency: 165,
      endFrequency: 80,
      duration: 450,
      gain: 0.22,
      delay: 150,
    },
  ];
}

export function shadowRecedeVoice(cellsPushed: number): Voice {
  const weight = Math.min(cellsPushed, 4) / 4;

  return {
    waveform: 'triangle',
    startFrequency: 880,
    endFrequency: 1320 + 220 * weight,
    duration: 90,
    gain: 0.09 + 0.07 * weight,
    delay: 0,
  };
}

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
