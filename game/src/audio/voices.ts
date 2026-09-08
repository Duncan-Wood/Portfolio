type Waveform = 'sine' | 'square' | 'sawtooth' | 'triangle';

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

export function hatVoice(): Voice {
  return {
    waveform: 'sawtooth',
    startFrequency: 2200,
    endFrequency: 300,
    duration: 110,
    gain: 0.18,
    delay: 0,
  };
}
