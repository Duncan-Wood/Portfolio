import { describe, expect, it } from 'vitest';
import {
  ARRIVALS_BETWEEN_LINES,
  CONNECTION_LOST,
  REACH_OUT_LINE,
  SHADOW_CLOSING_LINE,
  SHADOW_OPENING_LINE,
  STILL_CONNECTED,
  SHADOW_LINES,
  closingLine,
  recoveredLine,
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

  it('is silent through the first arrivals of a run', () => {
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
    for (const line of everyLine) {
      expect(line.length).toBeLessThanOrEqual(56);
    }
  });

  it('never repeats a line between tiers', () => {
    expect(new Set(everyLine).size).toBe(everyLine.length);
  });
});

describe('what is left when the shadow has won', () => {
  it('does not reuse a line the player has already been needled with', () => {
    expect(everyLine).not.toContain(SHADOW_CLOSING_LINE);
  });

  it('keeps both short enough to land', () => {
    expect(CONNECTION_LOST.length).toBeLessThanOrEqual(24);
    expect(SHADOW_CLOSING_LINE.length).toBeLessThanOrEqual(56);
  });
});

describe('what a lost run says it lost', () => {
  it('names the fragment the run was reaching for, and how close it got', () => {
    const line = closingLine({ reaching: 'The Hat', connectionsShort: 3 });

    expect(line).toContain('The Hat');
    expect(line).toContain('3');
  });

  it('says something different when the run was one connection away', () => {
    expect(closingLine({ reaching: 'My Voice', connectionsShort: 1 }))
      .not.toContain('1 connections');
  });

  it('falls back to the thesis when there was nothing left to reach for', () => {
    expect(closingLine({ reaching: null, connectionsShort: 0 }))
      .toBe(SHADOW_CLOSING_LINE);
  });

  it('never gives the player permission to leave', () => {
    const lines = [
      closingLine({ reaching: 'The Build', connectionsShort: 7 }),
      closingLine({ reaching: 'The Hat', connectionsShort: 1 }),
      closingLine({ reaching: null, connectionsShort: 0 }),
    ];

    for (const line of lines) {
      expect(line.toLowerCase()).not.toMatch(/tomorrow|come back|rest|another day|stop now/);
    }
  });
});

describe('how a run opens', () => {
  it('speaks in the same register as the rest of the shadow, not as a tutorial', () => {
    expect(SHADOW_OPENING_LINE.toLowerCase())
      .not.toMatch(/press|key|arrow|space|drop|rotate|match|click/);
  });

  it('obeys the closing line\'s rule, since it is read at the same decision', () => {
    expect(SHADOW_OPENING_LINE.toLowerCase())
      .not.toMatch(/tomorrow|come back|another day|stop now|do not have to/);
  });

  it('is short enough to read before the first piece falls', () => {
    expect(SHADOW_OPENING_LINE.length).toBeLessThanOrEqual(48);
  });
});

describe('what a finished memory says', () => {
  it('ends on the title the losing screen spends the whole run contradicting', () => {
    expect(STILL_CONNECTED).not.toBe(CONNECTION_LOST);
    expect(STILL_CONNECTED.toLowerCase()).toContain('connected');
  });

  it('names the memory that was recovered rather than congratulating in general', () => {
    expect(recoveredLine('High School')).toContain('High School');
    expect(recoveredLine('College')).toContain('College');
  });

  it('offers a way to reach a person without turning into a pitch', () => {
    expect(REACH_OUT_LINE.length).toBeLessThanOrEqual(32);
    expect(REACH_OUT_LINE.toLowerCase())
      .not.toMatch(/hire|resume|cv|recruit|opportunit|available for/);
  });
});
