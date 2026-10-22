import { describe, expect, it } from 'vitest';
import { Overthinking } from './overthinking';

function placeMany(habits: Overthinking, pieces: number, decisionsEach: number): void {
  for (let piece = 0; piece < pieces; piece += 1) {
    for (let decision = 0; decision < decisionsEach; decision += 1) {
      habits.decided();
    }
    habits.placed();
  }
}

describe('noticing a player overthink a piece', () => {
  it('says nothing on a fresh board', () => {
    expect(new Overthinking().due).toBe(false);
  });

  it('waits for a few pieces before it knows what normal looks like', () => {
    const habits = new Overthinking();

    placeMany(habits, 1, 2);
    placeMany(habits, 1, 12);

    expect(habits.due).toBe(false);
  });

  it('notices a piece that took far more decisions than usual on this board', () => {
    const habits = new Overthinking();

    placeMany(habits, 4, 2);
    placeMany(habits, 1, 9);

    expect(habits.due).toBe(true);
  });

  it('lets a careful piece go when it is only a little over the usual', () => {
    const habits = new Overthinking();

    placeMany(habits, 4, 3);
    placeMany(habits, 1, 5);

    expect(habits.due).toBe(false);
  });

  it('never calls a handful of decisions overthinking, even on a board of straight drops', () => {
    const habits = new Overthinking();

    placeMany(habits, 4, 0);
    placeMany(habits, 1, 4);

    expect(habits.due).toBe(false);
  });

  it('judges each piece against the ones before it, not against itself', () => {
    const habits = new Overthinking();

    placeMany(habits, 4, 3);
    placeMany(habits, 1, 7);

    expect(habits.due).toBe(true);
  });

  it('stays noticed for the rest of the board, however well the next pieces go', () => {
    const habits = new Overthinking();

    placeMany(habits, 4, 2);
    placeMany(habits, 1, 9);
    placeMany(habits, 3, 1);

    expect(habits.due).toBe(true);
  });

  it('starts over on a new board, forgetting the old average', () => {
    const habits = new Overthinking();

    placeMany(habits, 4, 2);
    placeMany(habits, 1, 9);
    habits.newBoard();

    placeMany(habits, 1, 12);
    expect(habits.due).toBe(false);

    placeMany(habits, 3, 2);
    placeMany(habits, 1, 10);
    expect(habits.due).toBe(true);
  });
});

describe('saying it only once', () => {
  it('goes quiet once it has been said, for the rest of the board', () => {
    const habits = new Overthinking();

    placeMany(habits, 4, 2);
    placeMany(habits, 1, 9);
    habits.told();

    expect(habits.due).toBe(false);
  });

  it('does not say it again on a later board, however much the player deliberates there', () => {
    const habits = new Overthinking();

    placeMany(habits, 4, 2);
    placeMany(habits, 1, 9);
    habits.told();
    habits.newBoard();

    placeMany(habits, 4, 2);
    placeMany(habits, 1, 9);

    expect(habits.due).toBe(false);
  });
});

