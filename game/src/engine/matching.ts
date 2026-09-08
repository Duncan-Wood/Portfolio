import { Board } from './board';
import { lightAdjacent, type NeuronSite } from './neurons';
import {
  COLUMNS,
  FIRST_VISIBLE_ROW,
  ROWS,
  isColour,
  isShadow,
  shadowHolding,
} from './grid';

const MATCH_SIZE = 4;

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

export interface ShadowHit extends GroupCell {
  turnedTo?: number;
}

export interface Group {
  pieceType: number;
  cells: GroupCell[];
}

export interface ChainLink {
  groups: Group[];
  cellsCleared: number;
  shadowPurified: ShadowHit[];
  neuronsLit: NeuronSite[];
}

export function findGroups(board: Board): Group[] {
  const visited = new Set<number>();
  const groups: Group[] = [];

  for (let row = FIRST_VISIBLE_ROW; row < ROWS; row += 1) {
    for (let column = 0; column < COLUMNS; column += 1) {
      const pieceType = board.pieceAt(column, row);

      if (!isColour(pieceType) || visited.has(keyOf(column, row))) {
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

export function clearStep(board: Board): ChainLink | null {
  const groups = findGroups(board);
  if (groups.length === 0) {
    return null;
  }

  let cellsCleared = 0;
  for (const group of groups) {
    for (const cell of group.cells) {
      board.clear(cell.column, cell.row);
      cellsCleared += 1;
    }
  }

  const purified = purifyShadow(board, groups);

  const neuronsLit = lightAdjacent(board, groups.flatMap((group) => group.cells));

  return { groups, cellsCleared, shadowPurified: purified, neuronsLit };
}

function purifyShadow(board: Board, groups: Group[]): ShadowHit[] {
  const touched = new Map<number, GroupCell>();

  for (const group of groups) {
    for (const cell of group.cells) {
      for (const step of NEIGHBOURS) {
        const column = cell.column + step.column;
        const row = cell.row + step.row;
        const key = row * COLUMNS + column;

        if (board.isInside(column, row) && isShadow(board.pieceAt(column, row))) {
          touched.set(key, { column, row });
        }
      }
    }
  }

  const purified: ShadowHit[] = [];

  for (const { column, row } of touched.values()) {
    const holding = shadowHolding(board.pieceAt(column, row) as number);

    board.clear(column, row);
    board.place(column, row, holding);
    purified.push({ column, row, turnedTo: holding });
  }

  return purified;
}

export function scoreLink(link: ChainLink, linkIndex: number): number {
  return link.cellsCleared * 10 * 2 ** linkIndex;
}

// Cells are marked visited when pushed, not popped; marking on pop counts a
// cell twice and inflates the score.
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

      if (
        row < FIRST_VISIBLE_ROW ||
        !board.isInside(column, row) ||
        visited.has(keyOf(column, row))
      ) {
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
