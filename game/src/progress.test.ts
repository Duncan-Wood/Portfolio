import { describe, expect, it } from 'vitest';
import { furthestFragment, resumePoint } from './progress';

describe('furthestFragment', () => {
  it('keeps the best run when this one fell short', () => {
    expect(furthestFragment(3, 1, 4)).toBe(3);
  });

  it('advances when this run went further', () => {
    expect(furthestFragment(1, 3, 4)).toBe(3);
  });

  it('starts from nothing remembered', () => {
    expect(furthestFragment(0, 2, 4)).toBe(2);
  });

  it('caps a mark set when the game had more fragments than it has now', () => {
    expect(furthestFragment(6, 1, 4)).toBe(4);
  });

  it('lets this run beat a capped mark', () => {
    expect(furthestFragment(6, 4, 4)).toBe(4);
  });
});

describe('resumePoint', () => {
  it('starts a first-time visitor at the beginning', () => {
    expect(resumePoint(0, 5)).toBe(0);
  });

  it('puts someone who stepped away back where they were', () => {
    expect(resumePoint(3, 5)).toBe(3);
  });

  it('starts over once the run was finished, so a return visit is fresh', () => {
    expect(resumePoint(5, 5)).toBe(0);
  });

  it('starts over rather than trusting a mark from a game with fewer fragments', () => {
    expect(resumePoint(9, 5)).toBe(0);
  });

  it('ignores a stored value that is not a number', () => {
    expect(resumePoint(NaN, 5)).toBe(0);
  });
});

describe('remembering how far a run got', () => {
  it('keeps the title only when this run set a new best', () => {
    expect(furthestFragment(3, 4, 5)).toBe(4);
    expect(furthestFragment(4, 2, 5)).toBe(4);
  });
});
