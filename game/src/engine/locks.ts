import { COLUMNS, PIECE_TYPE_COUNT, ROWS, isShadow, shadowCell } from './grid';
import { Board } from './board';
import { findGroups } from './matching';

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
  /** How many shadows the board opens holding. */
  shadows: number;
  /** How many ordinary tiles are seeded around them. */
  tiles: number;
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
    objective: 'free every shadow',
    shadows: 3,
    tiles: 9,
  },
];

/**
 * Whether this lock's board has been solved.
 *
 * The lock is taken but not yet read: every lock so far asks the same thing,
 * and inventing a discriminated union for one case would be scaffolding with
 * nothing in it. The parameter is here because the SIGNATURE is the honest one
 * — "is this lock solved" — and the day a lock asks for a chain instead, the
 * call sites already say which lock they mean.
 */
export function isSolved(_lock: Lock, board: Board): boolean {
  for (let row = 0; row < ROWS; row += 1) {
    for (let column = 0; column < COLUMNS; column += 1) {
      if (isShadow(board.pieceAt(column, row))) {
        return false;
      }
    }
  }
  return true;
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

  const total = lock.tiles + lock.shadows;
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

  // Shadows are placed by possessing tiles already on the board, because that
  // is the only way a shadow ever exists — it holds a colour, and freeing it
  // gives that colour back.
  let taken = 0;
  for (let row = ROWS - 1; row >= 0 && taken < lock.shadows; row -= 1) {
    for (let column = 0; column < COLUMNS && taken < lock.shadows; column += 1) {
      // Every other one, so they are not all in a line along the floor.
      if ((column + row) % 2 !== 0) {
        continue;
      }
      const piece = board.pieceAt(column, row);
      if (piece === null || isShadow(piece)) {
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
    if (piece === null) {
      continue;
    }
    board.clear(cell.column, cell.row);
    board.place(cell.column, cell.row, (piece + 1) % PIECE_TYPE_COUNT);
  }
}
