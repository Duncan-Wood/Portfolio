import { describe, expect, it } from 'vitest';
import { collectionEntries } from './memories';
import {
  ARRIVALS_BETWEEN_LINES,
  CONNECTION_LOST,
  REACH_OUT_LINE,
  SHADOW_OPENING_LINE,
  SHADOW_LINES,
  closingLine,
  OVERTHINKING_LINE,
  RECOVERED_LINE,
  shadowLine,
} from './shadow-voice';

const NEVER_SPOKEN: string[] = [];
const ENOUGH = ARRIVALS_BETWEEN_LINES;

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
  it('never repeats a line between tiers', () => {
    expect(new Set(everyLine).size).toBe(everyLine.length);
  });

  it('keeps every piece of copy short enough for the space it is drawn in', () => {
    for (const line of everyLine) {
      expect(line.length, line).toBeLessThanOrEqual(56);
    }

    expect(CONNECTION_LOST.length).toBeLessThanOrEqual(24);
    for (const { title } of collectionEntries()) {
      expect(closingLine({ reaching: title, connectionsShort: 99 }).length, title).toBeLessThanOrEqual(56);
    }
    expect(SHADOW_OPENING_LINE.length).toBeLessThanOrEqual(48);
    expect(RECOVERED_LINE.length).toBeLessThanOrEqual(150);
    expect(REACH_OUT_LINE.length).toBeLessThanOrEqual(32);
  });
});

describe('what a lost run says it lost', () => {
  it('names the fragment the run was reaching for and how close it got, and says nothing else', () => {
    expect(closingLine({ reaching: 'The Hat', connectionsShort: 3 })).toBe('3 connections short of The Hat.');
  });

  it('says one connection, not 1 connections', () => {
    expect(closingLine({ reaching: 'My Voice', connectionsShort: 1 })).toBe('One connection short of My Voice.');
  });

  it('is never the same line for two different runs', () => {
    const lines = [
      closingLine({ reaching: 'The Hat', connectionsShort: 3 }),
      closingLine({ reaching: 'The Hat', connectionsShort: 4 }),
      closingLine({ reaching: 'The Build', connectionsShort: 3 }),
    ];

    expect(new Set(lines).size).toBe(lines.length);
  });
});

describe('when the player is overthinking', () => {
  it('says so at its very next arrival, without waiting its usual turn', () => {
    expect(shadowLine(1, 0, NEVER_SPOKEN, true)).toBe(OVERTHINKING_LINE);
  });

  it('says it over whatever it would have said instead', () => {
    expect(shadowLine(20, ENOUGH, NEVER_SPOKEN, true)).toBe(OVERTHINKING_LINE);
  });

  it('does not say it twice on one board', () => {
    expect(shadowLine(1, 0, [OVERTHINKING_LINE], true)).toBeNull();
  });

  it('keeps it out of its usual lines', () => {
    expect(everyLine).not.toContain(OVERTHINKING_LINE);
  });
});
