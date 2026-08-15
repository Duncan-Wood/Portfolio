import { COLUMNS, ROWS } from './grid';

const EMPTY = null;

export class Board {
  private cells: (number | null)[] = new Array(COLUMNS * ROWS).fill(EMPTY);

  isInside(column: number, row: number): boolean {
    return column >= 0 && column < COLUMNS && row >= 0 && row < ROWS;
  }

  pieceAt(column: number, row: number): number | null {
    return this.isInside(column, row) ? this.cells[row * COLUMNS + column] : EMPTY;
  }

  isEmpty(column: number, row: number): boolean {
    return this.pieceAt(column, row) === EMPTY;
  }

  isBlocked(column: number, row: number): boolean {
    if (row < 0 && column >= 0 && column < COLUMNS) {
      return false;
    }
    return !this.isInside(column, row) || !this.isEmpty(column, row);
  }

  place(column: number, row: number, pieceType: number): void {
    if (!this.isInside(column, row)) {
      throw new RangeError(`Cannot place a piece outside the board at ${column},${row}`);
    }
    this.cells[row * COLUMNS + column] = pieceType;
  }

  settle(): void {
    for (let column = 0; column < COLUMNS; column += 1) {
      let target = ROWS - 1;
      for (let row = ROWS - 1; row >= 0; row -= 1) {
        const pieceType = this.pieceAt(column, row);
        if (pieceType === EMPTY) {
          continue;
        }
        this.cells[row * COLUMNS + column] = EMPTY;
        this.cells[target * COLUMNS + column] = pieceType;
        target -= 1;
      }
    }
  }
}
