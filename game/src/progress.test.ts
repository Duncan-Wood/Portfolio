import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  completions,
  forgetAllProgress,
  forgetProgressFromOlderMemories,
  forgetRun,
  foundFragments,
  foundIndices,
  freedButterflies,
  introSeen,
  loggedWith,
  rememberBestChain,
  rememberButterfly,
  rememberCompletion,
  rememberIntroSeen,
  resumePoint,
  runFinished,
} from './progress';

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
    expect(loggedWith([], 0, { title: 'The Build' }))
      .toEqual([{ title: 'The Build' }]);
  });

  it('appends the next one without disturbing the last', () => {
    const first = loggedWith([], 0, { title: 'The Build' });

    expect(loggedWith(first, 1, { title: 'No Johns' })).toEqual([
      { title: 'The Build' },
      { title: 'No Johns' },
    ]);
  });

  it('overwrites in place when a fragment is surfaced again on a later run', () => {
    const before = [{ title: 'The Build' }, { title: 'No Johns' }];

    expect(loggedWith(before, 0, { title: 'The Build' })).toEqual([
      { title: 'The Build' },
      { title: 'No Johns' },
    ]);
  });

  it('never leaves a hole, so the contact form can read it straight through', () => {
    const gappy = loggedWith([], 2, { title: 'The Laptop' });

    expect(gappy).toHaveLength(3);
    expect(gappy.every((entry) => entry !== undefined)).toBe(true);
  });

  it('counts a memory as found only where the log holds its title', () => {
    const log = [{ title: 'The Build' }, { title: '' }, { title: 'The Laptop' }];

    expect(foundIndices(log)).toEqual([0, 2]);
  });
});

describe('the memories a player has found', () => {
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

  it('has found nothing on a first visit', () => {
    expect(foundFragments()).toEqual([]);
  });

  it('keeps what an earlier visit found', () => {
    held.set('connected.log', '[{"title":"The Build"},{"title":"No Johns"}]');

    expect(foundFragments()).toEqual([0, 1]);
  });

  it('has found nothing when the stored log is not a list', () => {
    held.set('connected.log', '{"title":"The Build"}');

    expect(foundFragments()).toEqual([]);
  });
});

describe('whether a player has read the intro', () => {
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

  it('shows it to someone who has never dismissed it', () => {
    expect(introSeen()).toBe(false);
  });

  it('stops showing it once it has been dismissed', () => {
    rememberIntroSeen();
    expect(introSeen()).toBe(true);
  });

  it('still shows it to someone who played before the intro existed', () => {
    held.set('connected.played', 'true');
    expect(introSeen()).toBe(false);
  });
});

describe('the best chain a player has managed', () => {
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

  it('records a first result', () => {
    rememberBestChain(4);
    expect(held.get('connected.bestChain')).toBe('4');
  });

  it('keeps the deeper of the two, so a worse run cannot undo a good one', () => {
    rememberBestChain(6);
    rememberBestChain(3);
    expect(held.get('connected.bestChain')).toBe('6');
  });

  it('raises it when a later run goes deeper', () => {
    rememberBestChain(3);
    rememberBestChain(7);
    expect(held.get('connected.bestChain')).toBe('7');
  });

  it('ignores a run with no chain in it, which is not an achievement', () => {
    rememberBestChain(1);
    expect(held.has('connected.bestChain')).toBe(false);
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
    held.set('connected.log', '[{"title":"The Laptop"}]');
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

  it('keeps the intro dismissed, since new memories do not change how to play', () => {
    playedThrough();
    held.set('connected.introSeen', 'true');
    held.set('connected.memories', 'old signature');

    forgetProgressFromOlderMemories('new signature');

    expect(held.get('connected.introSeen')).toBe('true');
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

    expect(held.get('connected.log')).toBe('[{"title":"The Laptop"}]');
    expect(held.get('connected.resume')).toBe('3');
  });

  it('records the signature it cleared for, so the next visit is left alone', () => {
    playedThrough();

    forgetProgressFromOlderMemories('new signature');

    expect(held.get('connected.memories')).toBe('new signature');
  });
});

describe('a player starting over', () => {
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
    held.set('connected.log', '[{"title":"The Build"}]');
    held.set('connected.fragmentsTotal', '5');
    held.set('connected.resume', '1');
    held.set('connected.bestChain', '4');
    held.set('connected.played', 'true');
    held.set('connected.introSeen', 'true');
    held.set('connected.completions', '2');
    held.set('connected.unlocked', 'true');
  }

  it('forgets everything a run left behind, so the next visit is a first visit', () => {
    playedThrough();

    forgetAllProgress();

    for (const key of [
      'connected.log',
      'connected.fragmentsTotal',
      'connected.resume',
      'connected.bestChain',
      'connected.played',
      'connected.introSeen',
      'connected.completions',
    ]) {
      expect(held.has(key)).toBe(false);
    }
  });

  it('keeps the gate open, so starting over does not ask for the code again', () => {
    playedThrough();

    forgetAllProgress();

    expect(held.get('connected.unlocked')).toBe('true');
  });
});

describe('finishing the game and playing it again', () => {
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

  const everyMemory = JSON.stringify(
    ['The Build', 'No Johns', 'The Laptop', 'The Kickball', 'The Notebook'].map((title) => ({ title })),
  );

  it('counts a run as finished only once every memory has been found', () => {
    expect(runFinished(5)).toBe(false);

    held.set('connected.log', '[{"title":"The Build"},{"title":""},{"title":"The Laptop"}]');
    expect(runFinished(5)).toBe(false);

    held.set('connected.log', everyMemory);
    expect(runFinished(5)).toBe(true);
  });

  it('tallies every playthrough completed', () => {
    expect(completions()).toBe(0);

    rememberCompletion();
    rememberCompletion();

    expect(completions()).toBe(2);
  });

  it('starts the memories over for another run, keeping the tally and what the player knows', () => {
    held.set('connected.log', everyMemory);
    held.set('connected.fragmentsTotal', '5');
    held.set('connected.resume', '3');
    held.set('connected.introSeen', 'true');
    held.set('connected.played', 'true');
    held.set('connected.unlocked', 'true');
    rememberCompletion();

    forgetRun();

    expect(runFinished(5)).toBe(false);
    expect(held.has('connected.resume')).toBe(false);
    expect(completions()).toBe(1);
    expect(held.get('connected.introSeen')).toBe('true');
    expect(held.get('connected.unlocked')).toBe('true');
  });
});

describe('the butterflies a player has set free', () => {
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

  it('starts with none free', () => {
    expect(freedButterflies()).toEqual([]);
  });

  it('remembers the chapter each one left from', () => {
    rememberButterfly(3);
    rememberButterfly(1);

    expect(freedButterflies()).toEqual([1, 3]);
  });

  it('counts a chapter once however many times it is told', () => {
    rememberButterfly(2);
    rememberButterfly(2);

    expect(freedButterflies()).toEqual([2]);
  });

  it('reads a garbled store as none free rather than throwing', () => {
    held.set('connected.butterflies', 'not json');

    expect(freedButterflies()).toEqual([]);
  });

  it('lets them go again when the memories start over', () => {
    rememberButterfly(0);

    forgetRun();

    expect(freedButterflies()).toEqual([]);
  });
});
