import { Board } from './board';

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

  lock(board: Board): void {
    for (const cell of this.cells()) {
      if (board.isInside(cell.column, cell.row)) {
        board.place(cell.column, cell.row, cell.pieceType);
      }
    }
    board.settle();
  }

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
