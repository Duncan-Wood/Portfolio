import { describe, expect, it } from 'vitest';
import { loggedWith, resumePoint } from './progress';

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

describe('the log of what a run surfaced', () => {
  it('records the first fragment with what it cost', () => {
    expect(loggedWith([], 0, { title: 'The Build', tries: 3 }))
      .toEqual([{ title: 'The Build', tries: 3 }]);
  });

  it('appends the next one without disturbing the last', () => {
    const first = loggedWith([], 0, { title: 'The Build', tries: 1 });

    expect(loggedWith(first, 1, { title: 'No Johns', tries: 4 })).toEqual([
      { title: 'The Build', tries: 1 },
      { title: 'No Johns', tries: 4 },
    ]);
  });

  it('overwrites in place when a fragment is surfaced again on a later run', () => {
    const before = [{ title: 'The Build', tries: 9 }, { title: 'No Johns', tries: 2 }];

    expect(loggedWith(before, 0, { title: 'The Build', tries: 1 })).toEqual([
      { title: 'The Build', tries: 1 },
      { title: 'No Johns', tries: 2 },
    ]);
  });

  it('never leaves a hole, so the contact form can read it straight through', () => {
    const gappy = loggedWith([], 2, { title: 'The Laptop', tries: 5 });

    expect(gappy).toHaveLength(3);
    expect(gappy.every((entry) => entry !== undefined)).toBe(true);
  });
});
