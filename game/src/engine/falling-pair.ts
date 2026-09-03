import { Board } from './board';

/**
 * A literal union rather than `number`, so an out-of-range orientation is a
 * compile error rather than an `undefined` read past `SATELLITE_OFFSETS`.
 */
export type Orientation = 0 | 1 | 2 | 3;

export interface PairCell {
  column: number;
  row: number;
  pieceType: number;
}

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
   * Rotate clockwise, with a WALL KICK: if the satellite would land inside a wall,
   * retry shifted one column away from it, or rotating while flush against a wall
   * refuses and the button appears broken.
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

  fitsOn(board: Board): boolean {
    return this.fits(board, this.column, this.row, this.orientation);
  }

  /**
   * The `settle()` is what makes the halves independent: if the pivot lands on the
   * stack while the satellite is over a hole, the satellite keeps falling alone.
   * That is why the resting cells are returned rather than assumed.
   */
  lock(board: Board): PairCell[] {
    const placed = this.cells();
    for (const cell of placed) {
      board.place(cell.column, cell.row, cell.pieceType);
    }

    const moves = board.settle();

    return placed.map((cell) => {
      const move = moves.find(
        (candidate) => candidate.column === cell.column && candidate.fromRow === cell.row,
      );
      return move === undefined ? cell : { ...cell, row: move.toRow };
    });
  }

  /** The single mutation point: the check happens before the write. */
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
