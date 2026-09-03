import { COLUMNS, ROWS, isAnchored } from './grid';

/**
 * `null`, not `0`: piece type 0 is a real colour, so `if (!pieceAt())` would
 * treat it as empty.
 */
const EMPTY = null;

export interface TileMove {
  column: number;
  fromRow: number;
  toRow: number;
}

export class Board {
  private cells: (number | null)[] = new Array(COLUMNS * ROWS).fill(EMPTY);

  isInside(column: number, row: number): boolean {
    return column >= 0 && column < COLUMNS && row >= 0 && row < ROWS;
  }

  /** Total: reading off-board returns `EMPTY` rather than throwing. */
  pieceAt(column: number, row: number): number | null {
    return this.isInside(column, row) ? this.cells[row * COLUMNS + column] : EMPTY;
  }

  isEmpty(column: number, row: number): boolean {
    return this.pieceAt(column, row) === EMPTY;
  }

  isBlocked(column: number, row: number): boolean {
    return !this.isInside(column, row) || !this.isEmpty(column, row);
  }

  /**
   * Throws rather than ignoring a bad write: an overwrite destroys a tile the
   * player built with, silently. Callers ask first — `FallingPair` via `fits`,
   * the simulation via the topping-out rule.
   */
  place(column: number, row: number, pieceType: number): void {
    if (!this.isInside(column, row)) {
      throw new RangeError(`Cannot place a piece outside the board at ${column},${row}`);
    }

    if (!this.isEmpty(column, row)) {
      throw new RangeError(`Cannot place a piece over the one already at ${column},${row}`);
    }
    this.cells[row * COLUMNS + column] = pieceType;
  }

  clear(column: number, row: number): void {
    if (!this.isInside(column, row)) {
      throw new RangeError(`Cannot clear a cell outside the board at ${column},${row}`);
    }
    this.cells[row * COLUMNS + column] = EMPTY;
  }

  /**
   * The scan runs bottom-up, reading upward and writing downward, so it can never
   * overwrite a tile it has not yet visited and needs no temporary copy.
   *
   * An ANCHORED cell stays put and nothing falls past it: tiles above come to rest
   * ON it while the ones below compact among themselves.
   */
  settle(): TileMove[] {
    const moves: TileMove[] = [];

    for (let column = 0; column < COLUMNS; column += 1) {
      let target = ROWS - 1;

      for (let row = ROWS - 1; row >= 0; row -= 1) {
        const pieceType = this.pieceAt(column, row);
        if (pieceType === EMPTY) {
          continue;
        }

        if (isAnchored(pieceType)) {
          target = row - 1;
          continue;
        }

        if (row !== target) {
          moves.push({ column, fromRow: row, toRow: target });
        }

        this.cells[row * COLUMNS + column] = EMPTY;
        this.cells[target * COLUMNS + column] = pieceType;
        target -= 1;
      }
    }

    return moves;
  }

  /**
   * Where a tile dropped down this column comes to rest, or `-1` if nothing can
   * enter it. From the TOP down: scanning up from the floor for the deepest empty
   * cell is only correct if a column has no floating gaps, and anchored cells break
   * that.
   */
  landingRow(column: number): number {
    let landing = -1;

    for (let row = 0; row < ROWS; row += 1) {
      if (!this.isEmpty(column, row)) {
        break;
      }
      landing = row;
    }

    return landing;
  }

  reset(): void {
    this.cells.fill(EMPTY);
  }
}
