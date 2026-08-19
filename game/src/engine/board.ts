import { COLUMNS, ROWS } from './grid';

/*
 * The settled contents of the playfield. It knows nothing about the falling
 * pair, matching, scoring, or time — everything above it reads and writes the
 * board, but the board has no opinion about the rules.
 */

/**
 * `null` rather than `0` or `undefined`, so "no piece" cannot be confused with
 * piece type `0`, which is a real colour. A falsy check like `if (!pieceAt())`
 * would treat colour 0 as empty; comparing against `null` cannot.
 */
const EMPTY = null;

export class Board {
  /**
   * Flat rather than 2D, indexed `row * COLUMNS + column`. Private so the
   * storage layout can change without breaking callers, who only ever use
   * `(column, row)`.
   */
  private cells: (number | null)[] = new Array(COLUMNS * ROWS).fill(EMPTY);

  isInside(column: number, row: number): boolean {
    return column >= 0 && column < COLUMNS && row >= 0 && row < ROWS;
  }

  /** Total over all coordinates: reading off-board returns `EMPTY`, not a throw. */
  pieceAt(column: number, row: number): number | null {
    return this.isInside(column, row) ? this.cells[row * COLUMNS + column] : EMPTY;
  }

  isEmpty(column: number, row: number): boolean {
    return this.pieceAt(column, row) === EMPTY;
  }

  /**
   * Anything off the board or already occupied blocks a move. No exemption for
   * cells above the board: one used to exist so a pair could spawn with its
   * satellite at row -1, and the hidden row replaced it. Keeping it would let
   * the ceiling silently stop blocking, which is exactly what the topping-out
   * rule depends on.
   */
  isBlocked(column: number, row: number): boolean {
    return !this.isInside(column, row) || !this.isEmpty(column, row);
  }

  /**
   * Throws rather than ignoring an off-board or on-top-of-something write, since
   * a caller placing outside the board or over a tile the player built with has
   * a bug, and quiet failure would hide it — an overwrite destroys a tile with
   * no error and no failing test. Callers ask first: `FallingPair` via `fits`,
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
   * Gravity for already-placed tiles: each column compacted downward, closing
   * gaps. A tile never changes column.
   *
   * The scan runs bottom-up, moving each tile found to the lowest free slot.
   * Because it reads upward and writes downward it can never overwrite a tile
   * it has not yet visited, so no temporary copy is needed.
   *
   * Two runtime callers: `FallingPair.lock` (which is what lets the two halves
   * come to rest at different heights and SPLIT APART — Puyo behaviour, where a
   * Tetris piece stays rigid) and the cascade's settle beat. `resolveStep` is a
   * third caller, reached only from the test-only `resolveChain`.
   */
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
