import { Board } from './board';
import { COLUMNS, ROWS } from './grid';

export const MATCH_SIZE = 4;

const NEIGHBOURS = [
  { column: 0, row: -1 },
  { column: 1, row: 0 },
  { column: 0, row: 1 },
  { column: -1, row: 0 },
];

export interface GroupCell {
  column: number;
  row: number;
}

export interface Group {
  pieceType: number;
  cells: GroupCell[];
}

export interface ChainLink {
  groups: Group[];
  cellsCleared: number;
}

export function findGroups(board: Board): Group[] {
  const visited = new Set<number>();
  const groups: Group[] = [];

  for (let row = 0; row < ROWS; row += 1) {
    for (let column = 0; column < COLUMNS; column += 1) {
      const pieceType = board.pieceAt(column, row);
      if (pieceType === null || visited.has(keyOf(column, row))) {
        continue;
      }

      const cells = connectedCells(board, column, row, pieceType, visited);
      if (cells.length >= MATCH_SIZE) {
        groups.push({ pieceType, cells });
      }
    }
  }

  return groups;
}

export function resolveChain(board: Board): ChainLink[] {
  const links: ChainLink[] = [];

  for (;;) {
    board.settle();

    const groups = findGroups(board);
    if (groups.length === 0) {
      return links;
    }

    let cellsCleared = 0;
    for (const group of groups) {
      for (const cell of group.cells) {
        board.clear(cell.column, cell.row);
        cellsCleared += 1;
      }
    }
    links.push({ groups, cellsCleared });
  }
}

export function scoreChain(links: ChainLink[]): number {
  return links.reduce(
    (total, link, index) => total + link.cellsCleared * 10 * 2 ** index,
    0,
  );
}

function connectedCells(
  board: Board,
  startColumn: number,
  startRow: number,
  pieceType: number,
  visited: Set<number>,
): GroupCell[] {
  const cells: GroupCell[] = [];
  const pending: GroupCell[] = [{ column: startColumn, row: startRow }];
  visited.add(keyOf(startColumn, startRow));

  while (pending.length > 0) {
    const cell = pending.pop()!;
    cells.push(cell);

    for (const offset of NEIGHBOURS) {
      const column = cell.column + offset.column;
      const row = cell.row + offset.row;

      if (!board.isInside(column, row) || visited.has(keyOf(column, row))) {
        continue;
      }
      if (board.pieceAt(column, row) !== pieceType) {
        continue;
      }

      visited.add(keyOf(column, row));
      pending.push({ column, row });
    }
  }

  return cells;
}

function keyOf(column: number, row: number): number {
  return row * COLUMNS + column;
}
