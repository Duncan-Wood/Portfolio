import { COLUMNS, ROWS, isChrysalis } from './grid';
import { Board } from './board';

const NEIGHBOURS = [
  { column: 0, row: -1 },
  { column: 1, row: 0 },
  { column: 0, row: 1 },
  { column: -1, row: 0 },
];

export interface ChrysalisSite {
  column: number;
  row: number;
}

export function freeAdjacent(board: Board, cleared: readonly ChrysalisSite[]): ChrysalisSite[] {
  const reached = new Map<number, ChrysalisSite>();

  for (const cell of cleared) {
    for (const step of NEIGHBOURS) {
      const column = cell.column + step.column;
      const row = cell.row + step.row;

      if (isChrysalis(board.pieceAt(column, row))) {
        reached.set(row * COLUMNS + column, { column, row });
      }
    }
  }

  for (const { column, row } of reached.values()) {
    board.clear(column, row);
  }

  return [...reached.values()];
}

export function chrysalisOn(board: Board): ChrysalisSite | null {
  for (let row = 0; row < ROWS; row += 1) {
    for (let column = 0; column < COLUMNS; column += 1) {
      if (isChrysalis(board.pieceAt(column, row))) {
        return { column, row };
      }
    }
  }

  return null;
}
