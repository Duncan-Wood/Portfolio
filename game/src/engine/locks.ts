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
import { allLit } from './neurons';

/*
 * A lock: one board with something to work out. A run is a sequence of them, one
 * per node on the brain, and failing resets the lock rather than the run —
 * there is no death in front of the writing.
 *
 * Difficulty is DESIGN rather than speed: a hard lock needs a cleverer setup,
 * not faster fingers.
 */

export interface Lock {
  objective: string;
  /**
   * What solving it means. Deliberately not the shadows: hesitation feeds the
   * shadow, so as an objective it would make dithering lengthen the puzzle
   * rather than cost anything.
   */
  neurons: number;
  shadows: number;
  tiles: number;
  /**
   * The constraint, and so the difficulty dial. Level design rather than a feel
   * setting, which is why it lives here and not in `tuning.ts`.
   */
  pieces: number;
}

/**
 * Nothing seeds above this, so there is always board left to play in: a puzzle
 * that opens nearly full is not harder, only shorter.
 */
const SEED_ROWS = 3;

/**
 * One per fragment of the memory being unlocked. What escalates is the budget
 * PER NEURON, falling from four pieces to two and a half, which is why the
 * fourth board can ask for a cascade the first would be cruel to.
 *
 * `tiles + shadows + neurons` must fit COLUMNS x SEED_ROWS = 18. Overflow is
 * SILENT: the seeder stops, and a board with fewer neurons than its objective
 * counts cannot be solved.
 */
export const LOCKS: readonly Lock[] = [
  {
    objective: 'light every neuron',
    neurons: 3,
    shadows: 1,
    tiles: 11,
    // Roughly double what a solution needs: the first lock should be beaten.
    pieces: 12,
  },
  {
    objective: 'light every neuron',
    neurons: 3,
    shadows: 2,
    tiles: 11,
    pieces: 11,
  },
  {
    // The budget goes UP and the room per neuron still falls.
    objective: 'light every neuron',
    neurons: 4,
    shadows: 2,
    tiles: 10,
    pieces: 12,
  },
  {
    // The only board where one clear per neuron will not cover it: ten pieces
    // against four neurons means a cascade has to reach two of them.
    objective: 'light every neuron',
    neurons: 4,
    shadows: 2,
    tiles: 10,
    pieces: 10,
  },
];

/**
 * The lock for the fragment currently being earned, clamped at both ends.
 * Derived from the fragments earned rather than stored, so the counter and the
 * board cannot drift apart.
 */
export function lockFor(fragmentsEarned: number): Lock {
  const index = Math.max(0, Math.min(fragmentsEarned, LOCKS.length - 1));
  return LOCKS[index];
}

/**
 * Whether this lock's board has been solved: every neuron on it is lit.
 *
 * Says nothing about the shadows, on purpose. They can be all over the board
 * when the last neuron goes and the lock is still open — what they cost you is
 * pieces and room, not the objective.
 *
 * The lock is taken but not read: every lock so far asks the same thing. The
 * parameter is here because the signature is the honest one, and the day a lock
 * asks for something else the call sites already say which lock they mean.
 */
export function isSolved(_lock: Lock, board: Board): boolean {
  return allLit(board);
}

/**
 * Lay out the board this lock poses.
 *
 * Bottom-up so everything rests on the floor: `settle` would rearrange a seeded
 * board with floating tiles on the first clear anyway. Colours are rotated
 * rather than drawn, and the result checked for a group, because a board that
 * opens already matching solves itself the moment the first piece lands.
 *
 * `random` is injected so a lock is reproducible in a test.
 */
export function seedLock(board: Board, lock: Lock, random: () => number): void {
  board.reset();

  const total = lock.tiles + lock.shadows + lock.neurons;
  const heights = new Array<number>(COLUMNS).fill(0);

  // Spread rather than piled: the puzzle should ask the player to reach several
  // places, not dig one hole.
  for (let placed = 0; placed < total; placed += 1) {
    let column = Math.floor(random() * COLUMNS) % COLUMNS;

    // Shortest column wins if the pick is full, so the board opens flat enough
    // to play on whatever the random does.
    for (let tried = 0; tried < COLUMNS && heights[column] >= SEED_ROWS; tried += 1) {
      column = (column + 1) % COLUMNS;
    }
    if (heights[column] >= SEED_ROWS) {
      break;
    }

    const row = ROWS - 1 - heights[column];
    heights[column] += 1;

    // An even mix is what makes a group reachable from more than one direction.
    board.place(column, row, placed % PIECE_TYPE_COUNT);
  }

  /**
   * How many of a cell's neighbours could ever host a clear. Walls, neurons and
   * shadows cannot; a colour or an empty cell can.
   */
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

  // Spread and staggered, so the board asks the player to reach several places
  // and one cascade reaching two is worth setting up.
  //
  // Every site must have somewhere a clear could happen beside it, or the board
  // is not hard but impossible — neurons are ANCHORS, so nothing can fall in to
  // help. THREE ways in rather than two, because a shadow is about to take one
  // on purpose and the neuron has to survive that with one to spare.
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

        // OPEN ABOVE dominates: a neuron with nothing on top is reached by
        // dropping a piece onto it, where a buried one needs a clear at a
        // specific depth, which is a dig rather than a puzzle. Then SPREAD, then
        // ROOM to break ties.
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
      // Rather than seed fewer neurons than the objective counts.
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

  // A shadow possesses a tile already on the board, which is the only way one
  // exists. The FIRST is put beside a neuron deliberately, and that placement is
  // the point of the board: freeing it restores the tile it took, and a restored
  // tile can complete the group that freed it, so the shadow in the way is also
  // the way through. Nobody is told this; it is found.
  let taken = 0;

  for (const neuron of neurons) {
    if (taken >= lock.shadows) {
      break;
    }
    // Only a neighbour the neuron can spare: taking its last way in would wall
    // the neuron off rather than open it.
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
    board.place(beside.column, beside.row, shadowCell(1, piece));
    taken += 1;
  }

  for (let row = ROWS - 1; row >= 0 && taken < lock.shadows; row -= 1) {
    for (let column = 0; column < COLUMNS && taken < lock.shadows; column += 1) {
      // Every other one, so they are not all in a line along the floor.
      if ((column + row) % 2 !== 0) {
        continue;
      }
      const piece = board.pieceAt(column, row);
      if (!isColour(piece)) {
        continue;
      }

      board.clear(column, row);
      board.place(column, row, shadowCell(1, piece));
      taken += 1;
    }
  }

  // Nudging one tile breaks the group, and is cheaper than starting over.
  for (const group of findGroups(board)) {
    const cell = group.cells[0];
    const piece = board.pieceAt(cell.column, cell.row);
    // `(piece + 1) % PIECE_TYPE_COUNT` on a shadow or neuron would quietly turn
    // it into a tile.
    if (!isColour(piece)) {
      continue;
    }
    board.clear(cell.column, cell.row);
    board.place(cell.column, cell.row, (piece + 1) % PIECE_TYPE_COUNT);
  }
}
