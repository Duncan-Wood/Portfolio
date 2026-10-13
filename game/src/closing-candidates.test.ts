import { describe, expect, it } from 'vitest';
import { CLOSING_CANDIDATES, closingFromQuery } from './closing-candidates';
import { RECOVERED_LINE } from './shadow-voice';

describe('the closing line candidates', () => {
  it('keeps the current line as the first, so comparing starts from what ships today', () => {
    expect(CLOSING_CANDIDATES[0]).toBe(RECOVERED_LINE);
  });

  it('fits every candidate in the room the sky leaves for it', () => {
    for (const candidate of CLOSING_CANDIDATES) {
      expect(candidate.length).toBeLessThanOrEqual(150);
    }
  });

  it('picks the candidate a query names, counting from one', () => {
    expect(closingFromQuery('?closing=2')).toBe(CLOSING_CANDIDATES[1]);
  });

  it('falls back to the first when the query names nothing usable', () => {
    expect(closingFromQuery('')).toBe(CLOSING_CANDIDATES[0]);
    expect(closingFromQuery('?closing=0')).toBe(CLOSING_CANDIDATES[0]);
    expect(closingFromQuery('?closing=99')).toBe(CLOSING_CANDIDATES[0]);
    expect(closingFromQuery('?closing=two')).toBe(CLOSING_CANDIDATES[0]);
  });
});
