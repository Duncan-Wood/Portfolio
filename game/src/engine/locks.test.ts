import { describe, expect, it } from 'vitest';
import { COLUMNS, FIRST_VISIBLE_ROW, ROWS, isColour, isShadow } from './grid';
import { Board } from './board';
import { LOCKS, isSolved, seedLock } from './locks';

/** A deterministic "random" so a seeded board is the same board every time. */
const fixed = (values: number[]) => {
  let index = 0;
  return () => values[index++ % values.length];
};

const cellsOn = (board: Board) => {
  const found: { column: number; row: number; piece: number }[] = [];
  for (let row = 0; row < ROWS; row += 1) {
    for (let column = 0; column < COLUMNS; column += 1) {
      const piece = board.pieceAt(column, row);
      if (piece !== null) {
        found.push({ column, row, piece });
      }
    }
  }
  return found;
};

describe('a lock is a board with something to work out', () => {
  it('has an objective written in words the player can act on', () => {
    for (const lock of LOCKS) {
      expect(lock.objective.length).toBeGreaterThan(0);
      // Not "score 400" — a lock has to say what to DO.
      expect(lock.objective).toMatch(/[a-z]/);
    }
  });

  it('seeds the shadows the lock asks for', () => {
    const board = new Board();
    const lock = LOCKS[0];

    seedLock(board, lock, fixed([0.1, 0.4, 0.7, 0.2, 0.9, 0.5]));

    const shadows = cellsOn(board).filter((cell) => isShadow(cell.piece));
    expect(shadows).toHaveLength(lock.shadows);
  });

  it('never seeds a board that has already solved itself', () => {
    // A lock that opens with a group of four sitting on it is not a puzzle.
    const board = new Board();
    seedLock(board, LOCKS[0], fixed([0.05, 0.35, 0.65, 0.95, 0.15, 0.55]));

    expect(isSolved(LOCKS[0], board)).toBe(false);
  });

  it('rests everything it seeds on the floor, with no floating tiles', () => {
    const board = new Board();
    seedLock(board, LOCKS[0], fixed([0.2, 0.6, 0.4, 0.8, 0.1, 0.3]));

    for (const cell of cellsOn(board)) {
      const below = cell.row + 1;
      const supported = below >= ROWS || board.pieceAt(cell.column, below) !== null;
      expect(supported).toBe(true);
    }
  });

  it('leaves room to play above what it seeds', () => {
    const board = new Board();
    seedLock(board, LOCKS[0], fixed([0.5]));

    const highest = Math.min(...cellsOn(board).map((cell) => cell.row));
    expect(highest).toBeGreaterThan(FIRST_VISIBLE_ROW + 3);
  });

  it('is solved when the last shadow is gone, and not before', () => {
    const board = new Board();
    seedLock(board, LOCKS[0], fixed([0.3, 0.7, 0.5]));
    expect(isSolved(LOCKS[0], board)).toBe(false);

    for (let row = 0; row < ROWS; row += 1) {
      for (let column = 0; column < COLUMNS; column += 1) {
        if (isShadow(board.pieceAt(column, row))) {
          board.clear(column, row);
        }
      }
    }

    expect(isSolved(LOCKS[0], board)).toBe(true);
  });

  it('seeds colour under every shadow, since a shadow possesses a tile', () => {
    const board = new Board();
    seedLock(board, LOCKS[0], fixed([0.25, 0.55, 0.85]));

    // Freeing one has to give a tile back, so there is no such thing as a
    // shadow standing on nothing.
    for (const cell of cellsOn(board)) {
      if (isShadow(cell.piece)) {
        expect(isColour(cell.piece)).toBe(false);
      }
    }
    expect(cellsOn(board).some((cell) => isColour(cell.piece))).toBe(true);
  });
});
