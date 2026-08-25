import { describe, expect, it } from 'vitest';
import { COLUMNS, FIRST_VISIBLE_ROW, ROWS, isColour, isNeuron, isShadow } from './grid';
import { lightAdjacent, neuronsOn, unlitCount } from './neurons';
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

  it('seeds the neurons the lock asks for', () => {
    const board = new Board();
    const lock = LOCKS[0];

    seedLock(board, lock, fixed([0.1, 0.4, 0.7, 0.2, 0.9, 0.5]));

    expect(cellsOn(board).filter((cell) => isNeuron(cell.piece))).toHaveLength(lock.neurons);
  });

  it('spreads the neurons across columns rather than stacking one route', () => {
    const board = new Board();
    seedLock(board, LOCKS[0], fixed([0.1, 0.45, 0.8, 0.25, 0.6, 0.95]));

    const columns = new Set(neuronsOn(board).map((site) => site.column));
    expect(columns.size).toBe(LOCKS[0].neurons);
  });

  it('opens with a shadow standing beside a neuron', () => {
    // The discovery the whole board is built around: freeing a shadow gives
    // back the tile it took, so the thing in your way is also the thing you
    // needed. It is seeded rather than left to chance on the first lock, the
    // way Dr. Mario's level 0 is designed rather than rolled.
    const board = new Board();
    seedLock(board, LOCKS[0], fixed([0.3, 0.7, 0.5, 0.15, 0.85]));

    const beside = neuronsOn(board).some(({ column, row }) =>
      [[0, -1], [1, 0], [0, 1], [-1, 0]].some(([dx, dy]) =>
        isShadow(board.pieceAt(column + dx, row + dy))));

    expect(beside).toBe(true);
  });

  it('is solved when the last neuron lights, and not before', () => {
    const board = new Board();
    seedLock(board, LOCKS[0], fixed([0.3, 0.7, 0.5]));
    expect(isSolved(LOCKS[0], board)).toBe(false);

    // Light them one at a time: the board must not count itself solved until
    // the last one goes.
    const sites = neuronsOn(board);
    sites.forEach((site, index) => {
      lightAdjacent(board, [{ column: site.column, row: site.row - 1 }]);
      expect(isSolved(LOCKS[0], board)).toBe(index === sites.length - 1);
    });
  });

  it('does not care whether the shadows are gone', () => {
    // The old objective WAS the shadows, which meant hesitating lengthened the
    // puzzle instead of costing anything. Goal and threat are separate now.
    const board = new Board();
    seedLock(board, LOCKS[0], fixed([0.3, 0.7, 0.5]));

    for (const { column, row } of neuronsOn(board)) {
      lightAdjacent(board, [{ column, row: row - 1 }]);
    }

    expect(unlitCount(board)).toBe(0);
    expect(cellsOn(board).some((cell) => isShadow(cell.piece))).toBe(true);
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

describe('a seeded lock is always solvable', () => {
  /**
   * How many of a cell's neighbours could ever host a clear.
   *
   * Walls cannot, and neither can a neuron or a shadow: a neuron never clears,
   * and a shadow has to be driven off by a clear that has somewhere to happen.
   * Anything else — a colour, or an empty cell a piece could land in — counts.
   */
  const reachableNeighbours = (board: Board, column: number, row: number) => {
    let count = 0;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const c = column + dc;
      const r = row + dr;
      if (c < 0 || c >= COLUMNS || r < FIRST_VISIBLE_ROW || r >= ROWS) {
        continue;
      }
      const piece = board.pieceAt(c, r);
      if (isNeuron(piece) || isShadow(piece)) {
        continue;
      }
      count += 1;
    }
    return count;
  };

  it('never strands a neuron with only one way in', () => {
    // Measured before this existed: a competent bot solved 56% of seeded
    // boards at a budget of 12, and exactly 56% at 18 and at 30. More pieces
    // changed nothing, because the boards it failed were not hard — they were
    // impossible. The commonest shape was a neuron in the bottom corner with
    // two walls, a shadow, and a single tile beside it: light that one tile's
    // group or never light the neuron. Neurons are anchors, so nothing can
    // fall in to help.
    for (let attempt = 0; attempt < 200; attempt += 1) {
      const board = new Board();
      seedLock(board, LOCKS[0], Math.random);

      for (let row = 0; row < ROWS; row += 1) {
        for (let column = 0; column < COLUMNS; column += 1) {
          if (!isNeuron(board.pieceAt(column, row))) {
            continue;
          }
          expect(reachableNeighbours(board, column, row)).toBeGreaterThanOrEqual(2);
        }
      }
    }
  });

  it('still seeds every neuron the lock asked for', () => {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const board = new Board();
      seedLock(board, LOCKS[0], Math.random);

      let neurons = 0;
      for (let row = 0; row < ROWS; row += 1) {
        for (let column = 0; column < COLUMNS; column += 1) {
          if (isNeuron(board.pieceAt(column, row))) {
            neurons += 1;
          }
        }
      }
      expect(neurons).toBe(LOCKS[0].neurons);
    }
  });
});
