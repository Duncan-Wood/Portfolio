import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FRAGMENT_COUNT, nodeAt } from './memories';
import { completions, foundFragments, resumeAt } from './progress';
import { revealNextNode } from './reveal';

describe('revealing the next memory', () => {
  const held = new Map<string, string>();
  let writes: string[] = [];

  beforeEach(() => {
    held.clear();
    writes = [];
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => held.get(key) ?? null,
        setItem: (key: string, value: string) => {
          writes.push(key);
          held.set(key, value);
        },
        removeItem: (key: string) => {
          writes.push(key);
          held.delete(key);
        },
      },
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'localStorage');
  });

  function foundUpTo(count: number): void {
    for (let index = 0; index < count; index += 1) {
      revealNextNode(index);
    }
    writes = [];
  }

  it('finds the memory the player has reached and moves on to the next', () => {
    const reveal = revealNextNode(0);

    expect(reveal).toMatchObject({ kind: 'found', nodesRevealed: 1 });
    expect(reveal.kind === 'found' && reveal.node).toBe(nodeAt(0)!.node);
  });

  it('keeps the memory in the log under its own place', () => {
    foundUpTo(2);

    revealNextNode(2);

    expect(foundFragments()).toEqual([0, 1, 2]);
  });

  it('lets a player who steps away resume right after it', () => {
    foundUpTo(3);

    revealNextNode(3);

    expect(resumeAt(FRAGMENT_COUNT)).toBe(4);
  });

  it('says it is the first find only when nothing had been found before', () => {
    const first = revealNextNode(0);
    const second = revealNextNode(1);

    expect(first.kind === 'found' && first.firstFind).toBe(true);
    expect(second.kind === 'found' && second.firstFind).toBe(false);
  });

  it('does not count a completion for an ordinary find', () => {
    revealNextNode(0);

    expect(completions()).toBe(0);
  });

  it('wins on the last memory and counts the completion', () => {
    foundUpTo(FRAGMENT_COUNT - 1);

    const reveal = revealNextNode(FRAGMENT_COUNT - 1);

    expect(reveal).toMatchObject({ kind: 'won', nodesRevealed: FRAGMENT_COUNT });
    expect(completions()).toBe(1);
  });

  it('starts the next visit from the beginning once the run is won', () => {
    foundUpTo(FRAGMENT_COUNT - 1);

    revealNextNode(FRAGMENT_COUNT - 1);

    expect(resumeAt(FRAGMENT_COUNT)).toBe(0);
  });

  it('saves the memory and the resume point before it counts the completion', () => {
    foundUpTo(FRAGMENT_COUNT - 1);

    revealNextNode(FRAGMENT_COUNT - 1);

    expect(writes).toEqual([
      'connected.log',
      'connected.fragmentsTotal',
      'connected.resume',
      'connected.completions',
    ]);
  });

  it('finds nothing past the last memory, and saves nothing', () => {
    foundUpTo(FRAGMENT_COUNT);

    const reveal = revealNextNode(FRAGMENT_COUNT);

    expect(reveal).toEqual({ kind: 'none' });
    expect(writes).toEqual([]);
  });
});
