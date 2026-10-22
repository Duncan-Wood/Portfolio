import { describe, expect, it } from 'vitest';
import { stageStart, type HandoverStage } from './handover';
import { LockSequence } from './lock-sequence';

const calm = { resolving: false, storyHolding: false };
const solved = () => true;
const unsolved = () => false;

function solvedSequence(): LockSequence {
  const sequence = new LockSequence();
  sequence.checkSolved(calm, solved);
  return sequence;
}

describe('noticing that a lock is solved', () => {
  it('starts with nothing solved', () => {
    expect(new LockSequence().solved).toBe(false);
  });

  it('notices a solved board once, and says so only that time', () => {
    const sequence = new LockSequence();

    expect(sequence.checkSolved(calm, solved)).toBe(true);
    expect(sequence.checkSolved(calm, solved)).toBe(false);
    expect(sequence.solved).toBe(true);
  });

  it('keeps waiting while the board is not solved', () => {
    const sequence = new LockSequence();

    expect(sequence.checkSolved(calm, unsolved)).toBe(false);
    expect(sequence.solved).toBe(false);
  });

  it('does not even look at the board while a clear is resolving', () => {
    const sequence = new LockSequence();
    let looked = false;

    sequence.checkSolved({ resolving: true, storyHolding: false }, () => {
      looked = true;
      return true;
    });

    expect(looked).toBe(false);
    expect(sequence.solved).toBe(false);
  });

  it('does not notice a solved board while a story card is up', () => {
    const sequence = new LockSequence();

    expect(sequence.checkSolved({ resolving: false, storyHolding: true }, solved)).toBe(false);
    expect(sequence.solved).toBe(false);
  });

  it('stops looking at the board once it has noticed', () => {
    const sequence = solvedSequence();
    let looked = false;

    sequence.checkSolved(calm, () => {
      looked = true;
      return true;
    });

    expect(looked).toBe(false);
  });
});

describe('when a banked memory comes to the surface', () => {
  it('stays hidden until the lock is solved', () => {
    expect(new LockSequence().takeReveal(calm)).toBe(false);
  });

  it('surfaces once the board is solved and settled, and only once', () => {
    const sequence = solvedSequence();

    expect(sequence.takeReveal(calm)).toBe(true);
    expect(sequence.takeReveal(calm)).toBe(false);
  });

  it('waits for a clear to finish resolving', () => {
    const sequence = solvedSequence();

    expect(sequence.takeReveal({ resolving: true, storyHolding: false })).toBe(false);
    expect(sequence.takeReveal(calm)).toBe(true);
  });

  it('waits for a story card to go away', () => {
    const sequence = solvedSequence();

    expect(sequence.takeReveal({ resolving: false, storyHolding: true })).toBe(false);
    expect(sequence.takeReveal(calm)).toBe(true);
  });
});

function runHandover(sequence: LockSequence, frames: number, frameMs = 16): HandoverStage[] {
  const begun: HandoverStage[] = [];
  for (let frame = 0; frame < frames; frame += 1) {
    begun.push(...sequence.advance(frameMs, calm));
  }
  return begun;
}

describe('handing the solved board over', () => {
  it('does nothing before the lock is solved', () => {
    const sequence = new LockSequence();

    expect(runHandover(sequence, 500)).toEqual([]);
    expect(sequence.handingOver).toBe(false);
  });

  it('begins with the settle on the first frame after the lock is solved', () => {
    const sequence = solvedSequence();

    expect(sequence.advance(16, calm)).toEqual(['settle']);
    expect(sequence.handingOver).toBe(true);
  });

  it('holds at the settle while the memory is still waiting to surface', () => {
    const sequence = solvedSequence();

    const begun = runHandover(sequence, 500);

    expect(begun).toEqual(['settle']);
  });

  it('holds at the settle while a clear is resolving', () => {
    const sequence = solvedSequence();
    sequence.takeReveal(calm);
    const resolving = { resolving: true, storyHolding: false };

    const begun: HandoverStage[] = [];
    for (let frame = 0; frame < 500; frame += 1) {
      begun.push(...sequence.advance(16, resolving));
    }

    expect(begun).toEqual(['settle']);
  });

  it('runs every stage in order, once each, after the memory has surfaced', () => {
    const sequence = solvedSequence();
    sequence.takeReveal(calm);

    const begun = runHandover(sequence, 400);

    expect(begun).toEqual(['settle', 'fade', 'bloom', 'flight', 'return']);
  });

  it('does not advance while a story card is up', () => {
    const sequence = solvedSequence();
    sequence.takeReveal(calm);

    const begun = sequence.advance(5000, { resolving: false, storyHolding: true });

    expect(begun).toEqual([]);
    expect(sequence.handingOver).toBe(false);
  });

  it('reaches the fade after the settle has lasted its full time', () => {
    const sequence = solvedSequence();
    sequence.takeReveal(calm);
    sequence.advance(0, calm);

    expect(sequence.advance(stageStart('fade') - 1, calm)).toEqual([]);
    expect(sequence.advance(1, calm)).toEqual(['fade']);
  });
});

describe('starting a board over', () => {
  it('forgets that the last lock was solved and that a handover had begun', () => {
    const sequence = solvedSequence();
    sequence.takeReveal(calm);
    sequence.advance(16, calm);

    sequence.reset();

    expect(sequence.solved).toBe(false);
    expect(sequence.handingOver).toBe(false);
  });

  it('drops a memory that was waiting to surface', () => {
    const sequence = solvedSequence();

    sequence.reset();

    expect(sequence.takeReveal(calm)).toBe(false);
  });

  it('can solve and hand over the next board from scratch', () => {
    const sequence = solvedSequence();
    sequence.takeReveal(calm);
    runHandover(sequence, 400);

    sequence.reset();
    sequence.checkSolved(calm, solved);
    sequence.takeReveal(calm);

    expect(runHandover(sequence, 400)).toEqual(['settle', 'fade', 'bloom', 'flight', 'return']);
  });
});
