import { type Voice, type Waveform } from './voices';

const SEMITONES: Readonly<Record<string, number>> = {
  C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11,
};

export function frequencyOf(name: string): number {
  const match = /^([A-G]#?)(\d)$/.exec(name);
  if (match === null) {
    throw new Error(`Cannot read the note name ${name}.`);
  }

  const semitonesFromA4 = SEMITONES[match[1]] + (Number(match[2]) + 1) * 12 - 69;
  return 440 * 2 ** (semitonesFromA4 / 12);
}

type Pitch = string | number;

const hertz = (pitch: Pitch): number => (typeof pitch === 'number' ? pitch : frequencyOf(pitch));

interface Note {
  pitch: Pitch;
  at: number;
  length: number;
  slideTo?: Pitch;
  gain?: number;
}

interface Line {
  waveform: Waveform;
  gain: number;
  pan?: number;
  notes: Note[];
}

const THEME_LOUDNESS = 1.8;

function theme(lines: Line[]): Voice[] {
  return lines.flatMap(({ waveform, gain, pan, notes }) => notes.map((note) => ({
    waveform,
    startFrequency: hertz(note.pitch),
    endFrequency: hertz(note.slideTo ?? note.pitch),
    duration: note.length,
    gain: (note.gain ?? gain) * THEME_LOUDNESS,
    delay: note.at,
    ...(pan === undefined ? {} : { pan }),
  })));
}

const run = (pitches: Pitch[], from: number, every: number, length: number): Note[] => (
  pitches.map((pitch, step) => ({ pitch, at: from + step * every, length }))
);

export const MEMORY_THEMES: Readonly<Record<string, Voice[]>> = {
  'the-door': theme([
    { waveform: 'triangle', gain: 0.1, notes: [...run(['C4', 'E4', 'G4', 'C5'], 0, 130, 170), { pitch: 'C5', at: 650, length: 600 }, { pitch: 'G5', at: 650, length: 600 }] },
    { waveform: 'square', gain: 0.06, notes: [{ pitch: 'C2', at: 0, length: 220 }] },
  ]),

  'the-review': theme([
    {
      waveform: 'triangle',
      gain: 0.1,
      notes: [
        ...run(['E5', 'G5'], 0, 110, 120),
        ...run(['E5', 'G5'], 330, 110, 120),
        ...run(['G5', 'B5', 'D6'], 900, 110, 160),
      ],
    },
    { waveform: 'sawtooth', gain: 0.05, notes: [{ pitch: 'D4', at: 660, length: 230 }, { pitch: 'C#4', at: 700, length: 190 }] },
  ]),

  'the-theta': theme([
    {
      waveform: 'sine',
      gain: 0.09,
      notes: [
        { pitch: 'A5', at: 0, length: 70 },
        { pitch: 'C6', at: 140, length: 70 },
        { pitch: 'A5', at: 330, length: 70 },
        { pitch: 'E6', at: 400, length: 70 },
        { pitch: 'G5', at: 650, length: 70 },
        { pitch: 'B5', at: 720, length: 70 },
        { pitch: 'A6', at: 960, length: 90 },
      ],
    },
    { waveform: 'triangle', gain: 0.05, notes: [{ pitch: 'E6', slideTo: 'B6', at: 1250, length: 600 }] },
  ]),

  'the-kickball': theme([
    { waveform: 'triangle', gain: 0.1, notes: [...run(['G4', 'B4', 'D5', 'G5'], 0, 160, 200), { pitch: 'G4', at: 1300, length: 650 }, { pitch: 'D5', at: 1300, length: 650 }] },
    {
      waveform: 'sine',
      gain: 0.1,
      notes: [
        { pitch: 330, slideTo: 170, at: 800, length: 130 },
        { pitch: 300, slideTo: 170, at: 1000, length: 110, gain: 0.07 },
        { pitch: 270, slideTo: 170, at: 1150, length: 100, gain: 0.04 },
      ],
    },
  ]),

  'the-laptop': theme([
    { waveform: 'sine', gain: 0.05, notes: [{ pitch: 'A2', at: 0, length: 2000 }] },
    {
      waveform: 'triangle',
      gain: 0.09,
      notes: [
        { pitch: 'C4', at: 0, length: 420 },
        { pitch: 'G4', at: 380, length: 420 },
        { pitch: 'E4', at: 760, length: 340 },
        { pitch: 'C5', at: 1300, length: 800 },
      ],
    },
    { waveform: 'sawtooth', gain: 0.045, notes: [{ pitch: 'B4', at: 1100, length: 170 }] },
  ]),

  'the-transcript': theme([
    { waveform: 'triangle', gain: 0.09, pan: -0.5, notes: [...run(['D5', 'F5', 'A5'], 0, 220, 240), { pitch: 'A5', at: 1500, length: 700 }] },
    { waveform: 'sine', gain: 0.09, pan: 0.5, notes: [...run(['F5', 'A5', 'C6'], 560, 220, 240), { pitch: 'A5', at: 1500, length: 700 }] },
  ]),

  'the-notebook': theme([
    {
      waveform: 'sine',
      gain: 0.09,
      notes: [
        { pitch: 'D4', at: 0, length: 900 },
        { pitch: 'A3', at: 700, length: 900 },
        { pitch: 'F4', at: 1500, length: 900 },
        { pitch: 'E4', at: 2300, length: 1000 },
        { pitch: 'D4', at: 3100, length: 1700 },
      ],
    },
  ]),

  'no-johns': theme([
    {
      waveform: 'square',
      gain: 0.07,
      notes: [
        ...run(['A3', 'A3', 'C4', 'E4'], 0, 120, 90),
        { pitch: 'A4', at: 480, length: 130 },
        ...run(['G4', 'E4'], 700, 120, 90),
      ],
    },
    { waveform: 'sawtooth', gain: 0.1, notes: [{ pitch: 600, slideTo: 90, at: 1050, length: 180 }, { pitch: 'A2', at: 1050, length: 400 }] },
  ]),

  'the-hat': theme([
    { waveform: 'triangle', gain: 0.09, notes: [{ pitch: 'D4', at: 0, length: 520 }, { pitch: 'F4', at: 550, length: 520 }, { pitch: 'A4', at: 1100, length: 720 }] },
    { waveform: 'sine', gain: 0.1, notes: [{ pitch: 320, slideTo: 110, at: 1900, length: 300 }, { pitch: 300, slideTo: 100, at: 2250, length: 300 }] },
    {
      waveform: 'square',
      gain: 0.05,
      notes: [
        ...run(['C5', 'C5', 'D5', 'C5', 'E5'], 2750, 150, 80),
        { pitch: 'G4', at: 3650, length: 700 },
        { pitch: 'C5', at: 3650, length: 700 },
        { pitch: 'E5', at: 3650, length: 700 },
      ],
    },
  ]),

  'the-build': theme([
    { waveform: 'sawtooth', gain: 0.05, notes: [{ pitch: 'A1', slideTo: 'A2', at: 0, length: 900 }] },
    { waveform: 'square', gain: 0.06, notes: run(['C3', 'E3', 'G3', 'C4'], 600, 150, 70) },
    { waveform: 'sine', gain: 0.1, notes: [{ pitch: 1000, at: 1400, length: 250 }] },
    { waveform: 'triangle', gain: 0.08, notes: ['C4', 'E4', 'G4'].map((pitch) => ({ pitch, at: 1750, length: 800 })) },
  ]),
};

export function themeFor(photo: string): Voice[] {
  const found = MEMORY_THEMES[photo];
  if (found === undefined) {
    throw new Error(`No theme for the memory picture ${photo}.`);
  }

  return found;
}
