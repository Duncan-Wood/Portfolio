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
   * Note the asymmetry: cells above the board (`row < 0`) AND within the column
   * range report as NOT blocked, while walls and the floor do. This is load-bearing — a pair spawns
   * with its satellite at row -1, so without it the pair would collide with the
   * ceiling the instant it appeared.
   *
   * The cost is that a pair can sit partly off the top of the board, which is
   * why the scene skips drawing cells above row 0, and why `lock()` can discard
   * such a half. The hidden 13th row is the real fix; see PROGRESS.md.
   */
  isBlocked(column: number, row: number): boolean {
    if (row < 0 && column >= 0 && column < COLUMNS) {
      return false;
    }
    return !this.isInside(column, row) || !this.isEmpty(column, row);
  }

  /**
   * Throws rather than ignoring an off-board write, since a caller placing
   * outside the board has a bug and quiet failure would hide it.
   *
   * Does NOT check whether the cell is already occupied — it overwrites. Known
   * gap, reachable only when the stack reaches the spawn cell, fixed by the
   * topping-out rule that comes with the hidden row.
   */
  place(column: number, row: number, pieceType: number): void {
    if (!this.isInside(column, row)) {
      throw new RangeError(`Cannot place a piece outside the board at ${column},${row}`);
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
