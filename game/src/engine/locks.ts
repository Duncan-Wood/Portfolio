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
 * A lock: one board with something to work out.
 *
 * This is the escape-room turn, and it is a different game from the one that
 * was here. The matcher was an endless survival stack — you played until the
 * board filled, and the memories were paid out for lasting. That put a Puyo
 * skill gate in front of someone's life story, which for a portfolio is
 * backwards; and survival produces the satisfaction of DEXTERITY, where what
 * was wanted was the satisfaction of working something out.
 *
 * So a run is a sequence of locks, one per node on the brain. Each states an
 * objective in words you can act on, seeds a board that poses it, and is
 * solved or not. Failing resets the lock, never the run — there is no death in
 * front of the writing.
 *
 * Dr. Mario is the model, and it is already cited in `DESIGN-PLAN.md`: clear
 * the viruses, and level 0 is four of them. A stated, finite goal is why
 * nobody bounces off it, and why every round can be judged rather than merely
 * survived.
 *
 * Difficulty here is DESIGN rather than speed — a hard lock is one that needs
 * a clever setup, not faster fingers. That is the only kind of hard that
 * produces an "aha".
 */

export interface Lock {
  /** What the player is told to do, in words they can act on. */
  objective: string;
  /**
   * How many neurons the board poses, and therefore what solving it means.
   *
   * The objective used to be the shadows, and that was the fault under the
   * whole board: hesitation FEEDS the shadow, so dithering lengthened the
   * puzzle instead of costing anything, and the goal and the threat were the
   * same axis. Separating them is what lets the shadow finally be opposition.
   */
  neurons: number;
  /** How many shadows the board opens holding. */
  shadows: number;
  /** How many ordinary tiles are seeded around them. */
  tiles: number;
  /**
   * How many pieces the board gives you to do it in.
   *
   * The constraint, and therefore the difficulty dial. It is level design
   * rather than a feel setting, which is why it lives on the lock and not in
   * `tuning.ts`: two boards asking for the same three neurons are a different
   * puzzle at fourteen pieces than at eight, and that difference is the thing
   * being authored. Vite reloads this file on save, so sweeping it is still a
   * matter of seconds.
   */
  pieces: number;
}

/**
 * How far down the board a lock is allowed to seed.
 *
 * Everything sits on the floor and nothing is seeded above this, so there is
 * always board left to play in. A puzzle that opens nearly full is not harder,
 * it is just shorter.
 */
const SEED_ROWS = 3;

/**
 * The locks, in the order a run meets them.
 *
 * One, for now, deliberately: this is a prototype of the STRUCTURE, and the
 * question it exists to answer is whether a single board with a stated goal is
 * more fun than an endless one. Writing eight before playing one would be
 * answering it by assertion.
 */
export const LOCKS: readonly Lock[] = [
  {
    objective: 'light every neuron',
    neurons: 3,
    // ONE, where the old lock opened with three. The shadow is no longer what
    // you are here to remove, so a board crowded with them is just noise; one
    // standing next to a neuron is enough to pose the question the board is
    // really asking.
    shadows: 1,
    tiles: 11,
    // Generous, deliberately. Three neurons need three clears at worst, and a
    // clear costs two or three pieces on a board seeded this full — so twelve
    // is roughly double what a solution needs. The first lock is the tutorial
    // and it should be beaten; the dial tightens on the locks after it.
    pieces: 12,
  },
];

/**
 * Whether this lock's board has been solved: every neuron on it is lit.
 *
 * Says nothing about the shadows, on purpose. They can be all over the board
 * when the last neuron goes and the lock is still open — what they cost you is
 * pieces and room, not the objective.
 *
 * The lock is taken but not yet read: every lock so far asks the same thing,
 * and inventing a discriminated union for one case would be scaffolding with
 * nothing in it. The parameter is here because the SIGNATURE is the honest one
 * — "is this lock solved" — and the day a lock asks for a chain instead, the
 * call sites already say which lock they mean.
 */
export function isSolved(_lock: Lock, board: Board): boolean {
  return allLit(board);
}

/**
 * Lay out the board this lock poses.
 *
 * Built bottom-up in columns so everything rests on the floor: a seeded board
 * with tiles floating in it is not a puzzle, it is a bug the player has to
 * work around, and `settle` would silently rearrange it on the first clear
 * anyway.
 *
 * Colours are rotated rather than drawn at random, and the result is checked
 * for a group before it is handed over. A lock that opens with four in a row
 * already touching solves itself the moment the first piece lands, which reads
 * as the game being broken rather than as a gift.
 *
 * `random` is injected for the same reason the piece bag is: a lock has to be
 * reproducible in a test, and "it looked fine when I played it" is not a
 * regression test.
 */
export function seedLock(board: Board, lock: Lock, random: () => number): void {
  board.reset();

  const total = lock.tiles + lock.shadows + lock.neurons;
  const heights = new Array<number>(COLUMNS).fill(0);

  // Spread across the columns rather than piled: the puzzle should ask the
  // player to reach several places, not to dig one hole.
  for (let placed = 0; placed < total; placed += 1) {
    let column = Math.floor(random() * COLUMNS) % COLUMNS;

    // Shortest column wins if the pick is already full, which keeps the
    // opening board flat enough to play on whatever the random does.
    for (let tried = 0; tried < COLUMNS && heights[column] >= SEED_ROWS; tried += 1) {
      column = (column + 1) % COLUMNS;
    }
    if (heights[column] >= SEED_ROWS) {
      break;
    }

    const row = ROWS - 1 - heights[column];
    heights[column] += 1;

    // Rotating the colour rather than drawing it keeps the mix even, and an
    // even mix is what makes a group reachable from more than one direction.
    board.place(column, row, placed % PIECE_TYPE_COUNT);
  }

  /**
   * How many of a cell's neighbours could ever host a clear.
   *
   * Walls cannot, and neither can a neuron or a shadow: a neuron never clears,
   * and a shadow only leaves when a clear happens somewhere it can happen.
   * Anything else — a colour, or an empty cell a piece could land in — counts.
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

  // Neurons take a cell each, spread across columns and staggered in depth,
  // because the board should ask the player to reach SEVERAL places — that is
  // what makes one cascade reaching two of them worth setting up.
  //
  // Every site must have somewhere a clear could actually happen beside it,
  // and this is not a nicety. Measured before the check existed: a competent
  // bot solved 56% of seeded boards at a budget of twelve pieces, and exactly
  // 56% at eighteen and at thirty. More pieces changed nothing, because the
  // boards it failed were not hard, they were impossible. The commonest shape
  // was a neuron in the bottom corner with two walls, a shadow and a single
  // tile beside it — light that one tile's group or never light it at all. And
  // neurons are ANCHORS, so nothing can ever fall in to help.
  //
  // THREE rather than two, because a shadow is about to take one of them on
  // purpose (see below) and the neuron has to survive that with a way in to
  // spare.
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

        // Three things, in this order of weight.
        //
        // OPEN ABOVE is the big one, and it was the whole regression when this
        // heuristic only asked for room: a neuron with nothing on top of it can
        // be reached by dropping a piece straight onto it, where a buried one
        // needs a clear to happen at a specific depth. Siting for room alone
        // put neurons under the stack and the median solve went from four
        // pieces to twelve — solvable, but a dig rather than a puzzle.
        //
        // SPREAD, still, because the board should ask the player to reach
        // several places — that is what makes one cascade reaching two of them
        // worth setting up. Weighted under openness rather than over it.
        //
        // ROOM breaks the ties.
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
      // Nothing roomy enough anywhere: take any colour cell with two ways in
      // rather than seed fewer neurons than the objective counts.
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

  // Shadows are placed by possessing tiles already on the board, because that
  // is the only way a shadow ever exists — it holds a colour, and freeing it
  // gives that colour back.
  //
  // The FIRST one is put next to a neuron deliberately, and that placement is
  // the point of the whole board. Freeing a shadow restores the tile it took,
  // and a restored tile can complete the very group that freed it — so a
  // shadow sitting beside a neuron is not only the thing in your way, it is
  // the thing that gets you there. Nobody is told this. It is found, which is
  // the only way an "aha" has ever worked, and Dr. Mario's level 0 is designed
  // rather than rolled for exactly this reason.
  let taken = 0;

  for (const neuron of neurons) {
    if (taken >= lock.shadows) {
      break;
    }
    // Only a neighbour the neuron can spare. Taking its last way in is what
    // turned the designed opportunity into a dead board almost half the time:
    // the shadow beside a neuron is meant to be the thing that GETS you there,
    // not the thing that walls it off.
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

  // A board that has already solved itself is not a puzzle. Nudging one tile
  // is enough to break the group and cheaper than starting the layout again.
  for (const group of findGroups(board)) {
    const cell = group.cells[0];
    const piece = board.pieceAt(cell.column, cell.row);
    // `findGroups` only ever returns colour, but reading it back as one keeps
    // the arithmetic below honest: `(piece + 1) % PIECE_TYPE_COUNT` on a shadow
    // or a neuron would quietly turn it into a tile.
    if (!isColour(piece)) {
      continue;
    }
    board.clear(cell.column, cell.row);
    board.place(cell.column, cell.row, (piece + 1) % PIECE_TYPE_COUNT);
  }
}
