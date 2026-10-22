import { describe, expect, it } from 'vitest';
import { COLUMNS, FIRST_VISIBLE_ROW, ROWS, isColour, isNeuron, isShadow, neuronCell } from './grid';
import { lightAdjacent, neuronsOn, unlitCount } from './neurons';
import { Board } from './board';
import { LOCKS, SEED_ROWS, isSolved, lockFor, lockProgress, seedLock } from './locks';

const fixed = (values: number[]) => {
  let index = 0;
  return () => values[index++ % values.length];
};

const WITH_SHADOWS = LOCKS.find((lock) => lock.shadows > 0)!;

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
  it('never asks for more seeded cells than the seed area holds', () => {
    for (const lock of LOCKS) {
      expect(lock.tiles + lock.shadows + lock.neurons).toBeLessThanOrEqual(COLUMNS * SEED_ROWS);
    }
  });

  it('gives every lock a score that fills the memory picture', () => {
    for (const lock of LOCKS) {
      expect(lock.fillScore).toBeGreaterThan(0);
    }
  });

  it('never seeds a board that has already solved itself', () => {
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

  it('spreads the neurons across columns rather than stacking one route', () => {
    const board = new Board();
    seedLock(board, LOCKS[0], fixed([0.1, 0.45, 0.8, 0.25, 0.6, 0.95]));

    const columns = new Set(neuronsOn(board).map((site) => site.column));
    expect(columns.size).toBe(LOCKS[0].neurons);
  });

  it('opens with a shadow standing beside a neuron', () => {
    const board = new Board();
    seedLock(board, WITH_SHADOWS, fixed([0.3, 0.7, 0.5, 0.15, 0.85]));

    const beside = neuronsOn(board).some(({ column, row }) =>
      [[0, -1], [1, 0], [0, 1], [-1, 0]].some(([dx, dy]) =>
        isShadow(board.pieceAt(column + dx, row + dy))));

    expect(beside).toBe(true);
  });

  it('is solved when the last neuron lights, and not before', () => {
    const board = new Board();
    seedLock(board, LOCKS[0], fixed([0.3, 0.7, 0.5]));
    expect(isSolved(LOCKS[0], board)).toBe(false);

    const sites = neuronsOn(board);
    sites.forEach((site, index) => {
      lightAdjacent(board, [{ column: site.column, row: site.row - 1 }]);
      expect(isSolved(LOCKS[0], board)).toBe(index === sites.length - 1);
    });
  });

  it('does not care whether the shadows are gone', () => {
    const board = new Board();
    seedLock(board, WITH_SHADOWS, fixed([0.3, 0.7, 0.5]));

    for (const { column, row } of neuronsOn(board)) {
      lightAdjacent(board, [{ column, row: row - 1 }]);
    }

    expect(unlitCount(board)).toBe(0);
    expect(cellsOn(board).some((cell) => isShadow(cell.piece))).toBe(true);
    expect(isSolved(WITH_SHADOWS, board)).toBe(true);
  });

  it('opens on a lock with nothing opposing the player', () => {
    expect(LOCKS[0].shadows).toBe(0);
    expect(LOCKS[0].neurons).toBeLessThanOrEqual(2);
  });

  it('seeds colour under every shadow, since a shadow possesses a tile', () => {
    const board = new Board();
    seedLock(board, LOCKS[0], fixed([0.25, 0.55, 0.85]));

    for (const cell of cellsOn(board)) {
      if (isShadow(cell.piece)) {
        expect(isColour(cell.piece)).toBe(false);
      }
    }
    expect(cellsOn(board).some((cell) => isColour(cell.piece))).toBe(true);
  });
});

describe('a seeded lock is always solvable', () => {
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

describe('the run escalates across the memory it is unlocking', () => {
  it('starts slowest and falls faster board by board', () => {
    for (let index = 1; index < LOCKS.length; index += 1) {
      expect(LOCKS[index].fallInterval).toBeLessThan(LOCKS[index - 1].fallInterval);
    }
  });

  it('never eases the pressure as the memory fills in', () => {
    for (let index = 1; index < LOCKS.length; index += 1) {
      expect(LOCKS[index].neurons).toBeGreaterThanOrEqual(LOCKS[index - 1].neurons);
      expect(LOCKS[index].shadows).toBeGreaterThanOrEqual(LOCKS[index - 1].shadows);
    }
  });

  it('seeds every neuron and shadow of every lock, not just the first', () => {
    for (const lock of LOCKS) {
      const board = new Board();
      seedLock(board, lock, fixed([0.1, 0.4, 0.7, 0.2, 0.9, 0.5]));
      const cells = cellsOn(board);

      expect(cells.filter((cell) => isNeuron(cell.piece))).toHaveLength(lock.neurons);
      expect(cells.filter((cell) => isShadow(cell.piece))).toHaveLength(lock.shadows);
      expect(isSolved(lock, board)).toBe(false);
    }
  });
});

describe('lockFor picks the boards for the chapter being played', () => {
  it('walks the locks in order as chapters go by', () => {
    for (let chapter = 0; chapter < LOCKS.length; chapter += 1) {
      expect(lockFor(chapter)).toBe(LOCKS[chapter]);
    }
  });

  it('refuses a chapter that has no lock, instead of quietly playing another one', () => {
    expect(() => lockFor(LOCKS.length)).toThrow(RangeError);
    expect(() => lockFor(-1)).toThrow(RangeError);
  });
});

describe('how full the memory picture is', () => {
  const FILL_SCORE = 1000;

  const withNeurons = (lit: number, unlit: number): Board => {
    const board = new Board();
    for (let index = 0; index < lit + unlit; index += 1) {
      board.place(index, ROWS - 1, neuronCell(index < lit));
    }
    return board;
  };

  it('is empty before anything has happened', () => {
    expect(lockProgress(withNeurons(0, 3), 0, FILL_SCORE)).toBe(0);
  });

  it('follows the neurons when they are ahead of the score', () => {
    expect(lockProgress(withNeurons(1, 3), 0, FILL_SCORE)).toBe(0.25);
  });

  it('follows the score when it is ahead of the neurons', () => {
    expect(lockProgress(withNeurons(0, 4), 600, FILL_SCORE)).toBe(0.6);
  });

  it('takes whichever is further along', () => {
    expect(lockProgress(withNeurons(3, 1), 200, FILL_SCORE)).toBe(0.75);
    expect(lockProgress(withNeurons(1, 3), 500, FILL_SCORE)).toBe(0.5);
  });

  it('never goes past full however high the score climbs', () => {
    expect(lockProgress(withNeurons(0, 3), FILL_SCORE * 5, FILL_SCORE)).toBe(1);
  });

  it('is full when every neuron is lit', () => {
    expect(lockProgress(withNeurons(3, 0), 0, FILL_SCORE)).toBe(1);
  });

  it('follows only the score on a board with no neurons, rather than dividing by zero', () => {
    expect(lockProgress(new Board(), 250, FILL_SCORE)).toBe(0.25);
  });
});

describe('seeding a lock that does not fit', () => {
  it('refuses, instead of leaving a board that cannot be solved', () => {
    const tooBig = { neurons: 3, shadows: 1, tiles: COLUMNS * SEED_ROWS, fallInterval: 500, fillScore: 100 };

    expect(() => seedLock(new Board(), tooBig, fixed([0.5]))).toThrow(RangeError);
  });
});
