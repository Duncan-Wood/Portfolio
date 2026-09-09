import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { forgetProgressFromOlderMemories, loggedWith, resumePoint } from './progress';

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

describe('progress left behind by an older set of memories', () => {
  const held = new Map<string, string>();

  beforeEach(() => {
    held.clear();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => held.get(key) ?? null,
        setItem: (key: string, value: string) => held.set(key, value),
        removeItem: (key: string) => held.delete(key),
      },
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'localStorage');
  });

  function playedThrough(): void {
    held.set('connected.log', '[{"title":"The Laptop","tries":2}]');
    held.set('connected.fragmentsTotal', '5');
    held.set('connected.resume', '3');
    held.set('connected.played', 'true');
    held.set('connected.unlocked', 'true');
  }

  it('drops a log written against memories that have since changed', () => {
    playedThrough();
    held.set('connected.memories', 'old signature');

    forgetProgressFromOlderMemories('new signature');

    expect(held.has('connected.log')).toBe(false);
    expect(held.has('connected.fragmentsTotal')).toBe(false);
    expect(held.has('connected.resume')).toBe(false);
  });

  it('leaves the gate open, so a deploy does not ask friends for the code again', () => {
    playedThrough();
    held.set('connected.memories', 'old signature');

    forgetProgressFromOlderMemories('new signature');

    expect(held.get('connected.unlocked')).toBe('true');
  });

  it('still knows they played before, which no rewrite can make stale', () => {
    playedThrough();
    held.set('connected.memories', 'old signature');

    forgetProgressFromOlderMemories('new signature');

    expect(held.get('connected.played')).toBe('true');
  });

  it('keeps a run intact when the memories are the same, whatever else shipped', () => {
    playedThrough();
    held.set('connected.memories', 'same signature');

    forgetProgressFromOlderMemories('same signature');

    expect(held.get('connected.log')).toBe('[{"title":"The Laptop","tries":2}]');
    expect(held.get('connected.resume')).toBe('3');
  });

  it('records the signature it cleared for, so the next visit is left alone', () => {
    playedThrough();

    forgetProgressFromOlderMemories('new signature');

    expect(held.get('connected.memories')).toBe('new signature');
  });
});
