import {
  COLUMNS,
  FIRST_VISIBLE_ROW,
  PIECE_TYPE_COUNT,
  ROWS,
  isColour,
  isNeuron,
  isShadow,
  neuronCell,
  shadowCell,
} from './grid';
import { Board } from './board';
import { findGroups } from './matching';
import { allLit, litCount, neuronsOn } from './neurons';

export interface Lock {
  neurons: number;
  shadows: number;
  tiles: number;
  fallInterval: number;

  /** Score that fills the memory picture. Solving fills it regardless. */
  fillScore: number;
}

export const SEED_ROWS = 3;

export const LOCKS: readonly Lock[] = [
  {
    neurons: 2,
    shadows: 0,
    tiles: 12,
    fallInterval: 750,
    fillScore: 100,
  },
  {
    neurons: 3,
    shadows: 1,
    tiles: 11,
    fallInterval: 650,
    fillScore: 180,
  },
  {
    neurons: 4,
    shadows: 2,
    tiles: 10,
    fallInterval: 560,
    fillScore: 220,
  },
  {
    neurons: 5,
    shadows: 3,
    tiles: 9,
    fallInterval: 480,
    fillScore: 280,
  },
];

export function lockFor(chapterIndex: number): Lock {
  const lock = LOCKS[chapterIndex];
  if (lock === undefined) {
    throw new RangeError(`No lock for chapter ${chapterIndex}; there are ${LOCKS.length}`);
  }

  return lock;
}

export function isSolved(board: Board): boolean {
  return allLit(board);
}

export function lockProgress(board: Board, score: number, fillScore: number): number {
  const total = neuronsOn(board).length;
  const fromNeurons = total === 0 ? 0 : litCount(board) / total;
  return Math.max(fromNeurons, Math.min(score / fillScore, 1));
}

export function seedLock(
  board: Board,
  lock: Lock,
  random: () => number,
): void {
  board.reset();

  const total = lock.tiles + lock.shadows + lock.neurons;
  if (total > COLUMNS * SEED_ROWS) {
    throw new RangeError(`A lock of ${total} pieces does not fit ${COLUMNS} columns of ${SEED_ROWS} rows`);
  }

  const heights = new Array<number>(COLUMNS).fill(0);

  for (let placed = 0; placed < total; placed += 1) {
    let column = Math.floor(random() * COLUMNS) % COLUMNS;

    for (let tried = 0; tried < COLUMNS && heights[column] >= SEED_ROWS; tried += 1) {
      column = (column + 1) % COLUMNS;
    }
    const row = ROWS - 1 - heights[column];
    heights[column] += 1;

    board.place(column, row, placed % PIECE_TYPE_COUNT);
  }

  const reachable = (column: number, row: number): number => {
    let count = 0;
    for (const step of [{ c: 1, r: 0 }, { c: -1, r: 0 }, { c: 0, r: 1 }, { c: 0, r: -1 }]) {
      const c = column + step.c;
      const r = row + step.r;
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

  const neurons: { column: number; row: number }[] = [];

  for (let wanted = 0; wanted < lock.neurons; wanted += 1) {
    let chosen: { column: number; row: number } | null = null;
    let bestScore = -Infinity;

    for (let row = FIRST_VISIBLE_ROW; row < ROWS; row += 1) {
      for (let column = 0; column < COLUMNS; column += 1) {
        if (!isColour(board.pieceAt(column, row))) {
          continue;
        }
        const room = reachable(column, row);
        if (room < 3) {
          continue;
        }

        const openAbove = row === FIRST_VISIBLE_ROW || board.isEmpty(column, row - 1);
        const spread = neurons.length === 0
          ? 0
          : Math.min(...neurons.map((n) => Math.abs(n.column - column) * 2 + Math.abs(n.row - row)));
        const score = (openAbove ? 24 : 0) + spread * 3 + room;
        if (score > bestScore) {
          bestScore = score;
          chosen = { column, row };
        }
      }
    }

    if (chosen === null) {
      for (let row = ROWS - 1; row >= FIRST_VISIBLE_ROW && chosen === null; row -= 1) {
        for (let column = 0; column < COLUMNS && chosen === null; column += 1) {
          if (isColour(board.pieceAt(column, row)) && reachable(column, row) >= 2) {
            chosen = { column, row };
          }
        }
      }
    }

    if (chosen === null) {
      break;
    }

    board.clear(chosen.column, chosen.row);
    board.place(chosen.column, chosen.row, neuronCell(false));
    neurons.push(chosen);
  }

  let taken = 0;

  for (const neuron of neurons) {
    if (taken >= lock.shadows) {
      break;
    }
    const beside = [
      { column: neuron.column, row: neuron.row + 1 },
      { column: neuron.column - 1, row: neuron.row },
      { column: neuron.column + 1, row: neuron.row },
      { column: neuron.column, row: neuron.row - 1 },
    ].find(({ column, row }) => isColour(board.pieceAt(column, row))
      && reachable(neuron.column, neuron.row) >= 3);

    if (beside === undefined) {
      continue;
    }

    const piece = board.pieceAt(beside.column, beside.row) as number;
    board.clear(beside.column, beside.row);
    board.place(beside.column, beside.row, shadowCell(piece));
    taken += 1;
  }

  for (let row = ROWS - 1; row >= 0 && taken < lock.shadows; row -= 1) {
    for (let column = 0; column < COLUMNS && taken < lock.shadows; column += 1) {
      if ((column + row) % 2 !== 0) {
        continue;
      }
      const piece = board.pieceAt(column, row);
      if (!isColour(piece)) {
        continue;
      }

      board.clear(column, row);
      board.place(column, row, shadowCell(piece));
      taken += 1;
    }
  }

  for (const group of findGroups(board)) {
    const cell = group.cells[0];
    const piece = board.pieceAt(cell.column, cell.row);
    if (!isColour(piece)) {
      continue;
    }
    board.clear(cell.column, cell.row);
    board.place(cell.column, cell.row, (piece + 1) % PIECE_TYPE_COUNT);
  }
}
