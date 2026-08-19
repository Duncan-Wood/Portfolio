import { Board } from './board';

/*
 * The piece the player controls: two tiles that move together.
 *
 * One tile is the PIVOT and the other is the SATELLITE. Rotation swings the
 * satellite around the pivot, which stays put — this is why the pair rotates
 * predictably rather than drifting, and it is the standard model for
 * Puyo-style two-tile pieces.
 *
 * Every method that could move the pair takes the `Board` and returns a boolean
 * saying whether the move actually happened. Returning success rather than
 * throwing lets callers make decisions from it: the lock delay only resets on a
 * move that succeeded, and auto-repeat stops pushing when it hits a wall.
 */

/**
 * Which of the four rotational positions the satellite occupies.
 *
 * A union of literal numbers rather than a plain `number`, so the compiler
 * rejects an out-of-range orientation outright. Without it, an orientation of
 * `4` would silently index past `SATELLITE_OFFSETS` and yield `undefined`.
 */
export type Orientation = 0 | 1 | 2 | 3;

export interface PairCell {
  column: number;
  row: number;
  pieceType: number;
}

/**
 * Where the satellite sits relative to the pivot, indexed by orientation:
 * 0 = above, 1 = right, 2 = below, 3 = left.
 *
 * Clockwise order, so rotating is just `(orientation + 1) % 4` — no switch
 * statement and no trigonometry. Remember row increases DOWNWARD, which is why
 * "above" is `row: -1`.
 */
const SATELLITE_OFFSETS = [
  { column: 0, row: -1 },
  { column: 1, row: 0 },
  { column: 0, row: 1 },
  { column: -1, row: 0 },
];

export class FallingPair {
  constructor(
    public column: number,
    public row: number,
    public orientation: Orientation,
    public pivotType: number,
    public satelliteType: number,
  ) {}

  /**
   * The two absolute cells this pair currently occupies, pivot first.
   *
   * Position is stored as one coordinate plus an orientation rather than two
   * coordinates, so the two halves cannot drift apart or disagree. The pair of
   * cells is derived on demand here instead.
   */
  cells(): [PairCell, PairCell] {
    const offset = SATELLITE_OFFSETS[this.orientation];
    return [
      { column: this.column, row: this.row, pieceType: this.pivotType },
      {
        column: this.column + offset.column,
        row: this.row + offset.row,
        pieceType: this.satelliteType,
      },
    ];
  }

  moveLeft(board: Board): boolean {
    return this.moveTo(board, this.column - 1, this.row, this.orientation);
  }

  moveRight(board: Board): boolean {
    return this.moveTo(board, this.column + 1, this.row, this.orientation);
  }

  /**
   * Rotate the satellite one step clockwise, with a WALL KICK.
   *
   * A wall kick is the standard fix for a frustration: if you are flush against
   * the right wall and rotate so the satellite would land inside the wall, a
   * naive implementation just refuses and the button appears broken. Instead
   * this retries the same rotation shifted one column away from the wall.
   *
   * The kick direction is derived from where the satellite is going: if it is
   * heading right (`offset.column` = +1) we shift left by 1, and vice versa.
   * For vertical orientations `offset.column` is 0, so the kick is 0 and the
   * second attempt is identical to the first — harmless, because a vertical
   * rotation can only be blocked by a piece above or below, which shifting
   * sideways would not fix anyway.
   *
   * Only if BOTH the in-place rotation and the kicked rotation are blocked does
   * this fail.
   */
  rotateClockwise(board: Board): boolean {
    const rotated = ((this.orientation + 1) % 4) as Orientation;
    const kick = -SATELLITE_OFFSETS[rotated].column;

    return (
      this.moveTo(board, this.column, this.row, rotated) ||
      this.moveTo(board, this.column + kick, this.row, rotated)
    );
  }

  canFall(board: Board): boolean {
    return this.fits(board, this.column, this.row + 1, this.orientation);
  }

  fall(board: Board): boolean {
    return this.moveTo(board, this.column, this.row + 1, this.orientation);
  }

  /**
   * Whether this pair's current position is legal. Asked by the simulation
   * before a spawn, so the topping-out rule reads the pair's real cells rather
   * than re-deriving where a satellite sits at orientation 0.
   */
  fitsOn(board: Board): boolean {
    return this.fits(board, this.column, this.row, this.orientation);
  }

  /**
   * Commit both halves onto the board. After this the pair is history; the
   * tiles belong to the board.
   *
   * Writes unconditionally. Both halves are always on the board: the pivot
   * spawns in the topmost visible row with the satellite in the hidden row
   * above it, and a pair only ever moves down or sideways. This used to guard
   * with `isInside` and silently discard a half at row -1, which the hidden row
   * removed the need for — a bad write now throws out of `place` instead.
   *
   * `settle()` at the end is what makes the two halves independent: if the
   * pivot lands on the stack while the satellite is over a hole, the satellite
   * keeps falling on its own. Tetris pieces stay rigid; Puyo pairs split. This
   * one line is that entire design decision.
   */
  lock(board: Board): void {
    for (const cell of this.cells()) {
      board.place(cell.column, cell.row, cell.pieceType);
    }
    board.settle();
  }

  /**
   * The single mutation point: validate a candidate position and adopt it only
   * if it fits. Every move, rotation and fall funnels through here, so there is
   * exactly one place where the pair can end up somewhere illegal — and it
   * cannot, because the check happens before the write.
   */
  private moveTo(board: Board, column: number, row: number, orientation: Orientation): boolean {
    if (!this.fits(board, column, row, orientation)) {
      return false;
    }

    this.column = column;
    this.row = row;
    this.orientation = orientation;
    return true;
  }

  private fits(board: Board, column: number, row: number, orientation: Orientation): boolean {
    const offset = SATELLITE_OFFSETS[orientation];

    return (
      !board.isBlocked(column, row) &&
      !board.isBlocked(column + offset.column, row + offset.row)
    );
  }
}
