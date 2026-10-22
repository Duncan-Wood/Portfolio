import { describe, expect, it } from 'vitest';
import { CHAPTERS } from '../memories';
import { MEMORY_THEMES, frequencyOf, themeFor } from './memory-themes';

const photos = CHAPTERS.flatMap((chapter) => chapter.nodes.map((node) => node.photo!));

describe('frequencyOf', () => {
  it('puts A4 at concert pitch and doubles each octave', () => {
    expect(frequencyOf('A4')).toBeCloseTo(440);
    expect(frequencyOf('A5')).toBeCloseTo(880);
    expect(frequencyOf('A3')).toBeCloseTo(220);
  });

  it('reads sharps and the notes around middle C', () => {
    expect(frequencyOf('C4')).toBeCloseTo(261.63, 1);
    expect(frequencyOf('F#4')).toBeCloseTo(369.99, 1);
  });

  it('refuses a name it cannot read', () => {
    expect(() => frequencyOf('H4')).toThrow();
  });
});

describe('the theme of each memory', () => {
  it('exists for every memory in the game', () => {
    for (const photo of photos) {
      expect(MEMORY_THEMES[photo], photo).toBeDefined();
      expect(themeFor(photo).length, photo).toBeGreaterThan(0);
    }
  });

  it('is not shared with another memory', () => {
    const shapes = photos.map((photo) => JSON.stringify(themeFor(photo)));

    expect(new Set(shapes).size).toBe(photos.length);
  });

  it('plays quietly enough to sit under the game sounds', () => {
    for (const photo of photos) {
      for (const voice of themeFor(photo)) {
        expect(voice.gain, photo).toBeGreaterThan(0);
        expect(voice.gain, photo).toBeLessThanOrEqual(0.12);
      }
    }
  });

  it('plays only audible, positive-length notes', () => {
    for (const photo of photos) {
      for (const voice of themeFor(photo)) {
        expect(voice.duration, photo).toBeGreaterThan(0);
        expect(voice.delay, photo).toBeGreaterThanOrEqual(0);
        expect(voice.startFrequency, photo).toBeGreaterThanOrEqual(40);
        expect(voice.endFrequency, photo).toBeGreaterThanOrEqual(40);
        expect(voice.startFrequency, photo).toBeLessThanOrEqual(4000);
      }
    }
  });

  it('is over within a few seconds, so it never talks over the next find', () => {
    for (const photo of photos) {
      const end = Math.max(...themeFor(photo).map((voice) => voice.delay + voice.duration));

      expect(end, photo).toBeLessThanOrEqual(5200);
    }
  });

  it('begins right away', () => {
    for (const photo of photos) {
      expect(Math.min(...themeFor(photo).map((voice) => voice.delay)), photo).toBe(0);
    }
  });
});
