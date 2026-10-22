import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FRAGMENT_COUNT } from './memories';
import {
  playedBefore,
  rememberCompletion,
  rememberIntroSeen,
  rememberPlayed,
  setFoundMemories,
} from './progress';
import { chooseOpening } from './opening';

describe('how a run opens', () => {
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

  it('introduces the game to a first-time visitor', () => {
    expect(chooseOpening()).toBe('intro');
  });

  it('keeps introducing the game until the intro has been seen', () => {
    chooseOpening();

    expect(chooseOpening()).toBe('intro');
  });

  it('remembers that someone has played, so the next visit is not a first visit', () => {
    chooseOpening();

    expect(playedBefore()).toBe(true);
  });

  it('has the shadow greet someone who came back without ever finishing', () => {
    rememberIntroSeen();
    rememberPlayed();

    expect(chooseOpening()).toBe('shadow');
  });

  it('says nothing to someone who saw the intro but has not played yet', () => {
    rememberIntroSeen();

    expect(chooseOpening()).toBe('nothing');
    expect(playedBefore()).toBe(true);
  });

  it('says nothing to someone who has finished the game before and is playing again', () => {
    rememberIntroSeen();
    rememberPlayed();
    rememberCompletion();

    expect(chooseOpening()).toBe('nothing');
  });

  it('goes straight to the ending for someone who found every memory', () => {
    setFoundMemories(FRAGMENT_COUNT, Array.from({ length: FRAGMENT_COUNT }, (_unused, index) => `memory ${index}`));

    expect(chooseOpening()).toBe('victory');
  });

  it('does not treat a run with one memory missing as finished', () => {
    setFoundMemories(FRAGMENT_COUNT - 1, Array.from({ length: FRAGMENT_COUNT }, (_unused, index) => `memory ${index}`));

    expect(chooseOpening()).not.toBe('victory');
  });
});
