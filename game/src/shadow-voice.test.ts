import { describe, expect, it } from 'vitest';
import { ARRIVALS_BETWEEN_LINES, SHADOW_LINES, shadowLine } from './shadow-voice';

const NEVER_SPOKEN: string[] = [];
const ENOUGH = ARRIVALS_BETWEEN_LINES;

/** Every line it knows, flattened, for the exhaustion cases. */
const everyLine = SHADOW_LINES.flat();

describe('when the shadow is allowed to speak', () => {
  it('says nothing until it has taken enough ground since the last time', () => {
    for (let arrivals = 0; arrivals < ENOUGH; arrivals += 1) {
      expect(shadowLine(1, arrivals, NEVER_SPOKEN)).toBeNull();
    }
  });

  it('speaks once it has', () => {
    expect(shadowLine(1, ENOUGH, NEVER_SPOKEN)).not.toBeNull();
  });

  it('is silent through the first arrivals of a run', () => {
    // The counter starts at zero, so the creature gets to be a thing on the
    // board before it is a voice. The first sighting should not come with
    // captions.
    expect(shadowLine(1, 0, NEVER_SPOKEN)).toBeNull();
  });
});

describe('what it picks', () => {
  it('opens with the gentlest thing it has', () => {
    expect(shadowLine(1, ENOUGH, NEVER_SPOKEN)).toBe(SHADOW_LINES[0][0]);
  });

  it('gets more intimate the more of the board it holds', () => {
    const barely = shadowLine(1, ENOUGH, NEVER_SPOKEN);
    const winning = shadowLine(20, ENOUGH, NEVER_SPOKEN);

    expect(barely).toBe(SHADOW_LINES[0][0]);
    expect(winning).toBe(SHADOW_LINES[SHADOW_LINES.length - 1][0]);
  });

  it('never says the same thing twice', () => {
    const spoken: string[] = [];

    for (let turn = 0; turn < everyLine.length; turn += 1) {
      const line = shadowLine(20, ENOUGH, spoken);
      expect(line).not.toBeNull();
      expect(spoken).not.toContain(line);
      spoken.push(line!);
    }

    expect(new Set(spoken).size).toBe(everyLine.length);
  });

  it('drops to a gentler tier rather than going quiet mid-run', () => {
    // It is winning, and everything it has for winning is used up. A long
    // grinding run should still have something left to say.
    const topTier = SHADOW_LINES[SHADOW_LINES.length - 1];

    const line = shadowLine(20, ENOUGH, [...topTier]);

    expect(line).not.toBeNull();
    expect(topTier).not.toContain(line);
  });

  it('goes quiet for good once it has said everything', () => {
    expect(shadowLine(20, ENOUGH, everyLine)).toBeNull();
  });
});

describe('the writing itself', () => {
  it('keeps every line short enough to read at a glance', () => {
    // It appears over a board the player is still playing, and it does not stop
    // the game. Anything longer than this is a wall they have to choose between
    // reading and playing.
    for (const line of everyLine) {
      expect(line.length).toBeLessThanOrEqual(56);
    }
  });

  it('never repeats a line between tiers', () => {
    expect(new Set(everyLine).size).toBe(everyLine.length);
  });
});
