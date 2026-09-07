import { Board } from './board';
import { lightAdjacent, type NeuronSite } from './neurons';
import {
  COLUMNS,
  FIRST_VISIBLE_ROW,
  ROWS,
  isColour,
  isShadow,
  shadowCell,
  shadowHolding,
  shadowStrength,
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
  strength: number;
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
  shadowDamaged: ShadowHit[];
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

export function clearStep(board: Board, linkIndex: number): ChainLink | null {
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

  const { purified, damaged } = damageShadow(board, groups, linkIndex + 1);

  const neuronsLit = lightAdjacent(board, groups.flatMap((group) => group.cells));

  return { groups, cellsCleared, shadowPurified: purified, shadowDamaged: damaged, neuronsLit };
}

function damageShadow(
  board: Board,
  groups: Group[],
  damage: number,
): { purified: ShadowHit[]; damaged: ShadowHit[] } {
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
  const damaged: ShadowHit[] = [];

  for (const { column, row } of touched.values()) {
    const cell = board.pieceAt(column, row) as number;
    const was = shadowStrength(cell);
    const holding = shadowHolding(cell);
    const remaining = was - damage;

    board.clear(column, row);

    if (remaining <= 0) {
      board.place(column, row, holding);
      purified.push({ column, row, strength: was, turnedTo: holding });
    } else {
      board.place(column, row, shadowCell(remaining, holding));
      damaged.push({ column, row, strength: remaining });
    }
  }

  return { purified, damaged };
}

export function resolveStep(board: Board, linkIndex = 0): ChainLink | null {
  board.settle();
  return clearStep(board, linkIndex);
}

export function resolveChain(board: Board): ChainLink[] {
  const links: ChainLink[] = [];

  for (;;) {
    const link = resolveStep(board, links.length);
    if (link === null) {
      return links;
    }
    links.push(link);
  }
}

export function scoreLink(link: ChainLink, linkIndex: number): number {
  return link.cellsCleared * 10 * 2 ** linkIndex;
}

export function scoreChain(links: ChainLink[]): number {
  return links.reduce((total, link, index) => total + scoreLink(link, index), 0);
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
