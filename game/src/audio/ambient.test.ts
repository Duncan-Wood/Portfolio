import { describe, expect, it } from 'vitest';
import { AMBIENT_GAP_MS, STILL_AMBIENT, ambientAfter, ambientVoices } from './ambient';

describe('the ambient music', () => {
  it('stays quiet between the drops', () => {
    for (let step = 0; step < 40; step += 1) {
      for (const voice of ambientVoices(step, 3)) {
        expect(voice.gain).toBeLessThanOrEqual(0.06);
        expect(voice.gain).toBeGreaterThan(0);
      }
    }
  });

  it('plays the same notes for the same step, with nothing left to chance', () => {
    expect(ambientVoices(7, 4)).toEqual(ambientVoices(7, 4));
  });

  it('does not repeat one note over and over', () => {
    const pitches = new Set(
      Array.from({ length: 24 }, (_, step) => ambientVoices(step, 0)[0].startFrequency),
    );

    expect(pitches.size).toBeGreaterThanOrEqual(4);
  });

  it('adds a second voice once more of the story has been found', () => {
    expect(ambientVoices(3, 0)).toHaveLength(1);
    expect(ambientVoices(3, 6).length).toBeGreaterThan(1);
  });

  it('waits out its gap before playing, then plays once', () => {
    const early = ambientAfter(STILL_AMBIENT, AMBIENT_GAP_MS - 1, 0);
    expect(early.voices).toEqual([]);

    const due = ambientAfter(early.clock, 1, 0);
    expect(due.voices.length).toBeGreaterThan(0);
    expect(due.clock.step).toBe(1);
    expect(ambientAfter(due.clock, 10, 0).voices).toEqual([]);
  });

  it('carries the time left over into the next gap', () => {
    const due = ambientAfter(STILL_AMBIENT, AMBIENT_GAP_MS + 40, 0);

    expect(due.clock.elapsed).toBe(40);
  });

  it('plays only once for a long stall, rather than a burst of notes', () => {
    const stalled = ambientAfter(STILL_AMBIENT, AMBIENT_GAP_MS * 5, 0);

    expect(stalled.clock.step).toBe(1);
    expect(stalled.clock.elapsed).toBeLessThan(AMBIENT_GAP_MS);
  });
});
