export const COLUMNS = 6;
export const ROWS = 12;
export const PIECE_TYPE_COUNT = 6;

export function pieceTypeAt(column: number, row: number): number {
  assertOnBoard(column, 'column', COLUMNS);
  assertOnBoard(row, 'row', ROWS);

  return (column + row) % PIECE_TYPE_COUNT;
}

function assertOnBoard(coordinate: number, name: string, limit: number): void {
  if (!Number.isInteger(coordinate) || coordinate < 0 || coordinate >= limit) {
    throw new RangeError(`Expected ${name} to be a whole number in 0..${limit - 1}, received ${coordinate}`);
  }
}
