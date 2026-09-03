import { COLUMNS, ROWS, isAnchored } from './grid';

/*
 * The settled contents of the playfield. It knows nothing about the falling
 * pair, matching, scoring or time.
 */

/**
 * `null`, not `0`: piece type 0 is a real colour, so `if (!pieceAt())` would
 * treat it as empty.
 */
const EMPTY = null;

/**
 * One tile's journey during a settle. The board is in its final state by the
 * time anything renders, so without this a fall can only be drawn as a teleport.
 */
export interface TileMove {
  column: number;
  fromRow: number;
  toRow: number;
}

export class Board {
  /** Flat rather than 2D, indexed `row * COLUMNS + column`. */
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

  /**
   * No exemption for cells above the board: the topping-out rule depends on the
   * ceiling blocking.
   */
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
   * Gravity for already-placed tiles: each column compacted downward. A tile
   * never changes column.
   *
   * The scan runs bottom-up, reading upward and writing downward, so it can
   * never overwrite a tile it has not yet visited and needs no temporary copy.
   *
   * An ANCHORED cell stays put and nothing falls past it: tiles above come to
   * rest ON it while the ones below compact among themselves.
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

        // The floor for everything above it. The scan is bottom-up, so `target`
        // is never below `row` here and the tiles beneath are left alone.
        if (isAnchored(pieceType)) {
          target = row - 1;
          continue;
        }

        // Reporting a tile that has not moved would animate a zero-length drop.
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
   * enter it.
   *
   * From the TOP down. Scanning up from the floor for the deepest empty cell is
   * only correct if a column has no floating gaps, and anchored cells break
   * that: the pocket under a neuron is unreachable, and a piece must land ON it.
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
