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

/*
 * The match rule and the cascade: what counts as a group, what clearing does,
 * and how a chain scores. Pure, so the whole rule set is testable from ASCII
 * pictures of boards.
 */

/** How many connected tiles are needed to clear. */
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

/**
 * A shadow cell a link hit. Carried because the scene cannot recover it: by the
 * time anything renders, a purified cell holds a colour and a damaged one holds
 * its new strength.
 *
 * `strength` means different things in the two arrays this appears in. In
 * `shadowPurified` it is the strength broken AT, with `turnedTo` the colour left
 * behind; in `shadowDamaged` it is the strength LEFT, and `turnedTo` is absent.
 */
export interface ShadowHit extends GroupCell {
  strength: number;
  turnedTo?: number;
}

/** One set of connected same-coloured tiles that is large enough to clear. */
export interface Group {
  pieceType: number;
  cells: GroupCell[];
}

/**
 * One step of a cascade: everything that cleared simultaneously.
 *
 * Purified and damaged are reported separately so the scene can tell "your clear
 * did nothing" from "your clear took a hit off it" — a dented shadow is still on
 * the board, and that is what teaches the player a chain finishes the job.
 *
 * `neuronsLit` is per link so a deep chain lights them a beat at a time rather
 * than paying out all at once at the end.
 */
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

  // From the first VISIBLE row: a tile resting in the hidden field is inert.
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

/**
 * Clear every group on the board, WITHOUT applying gravity: leaving the holes
 * open for a beat is what separates cause from effect and makes a cascade
 * legible. `null` when nothing matched, which is how a cascade ends.
 */
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

  // Depth is the damage. `linkIndex` is 0-based, so an ordinary clear deals 1.
  const { purified, damaged } = damageShadow(board, groups, linkIndex + 1);

  // Both belong inside the clearing step rather than a layer up in `Simulation`:
  // every other path in would otherwise clear groups without the shadow receding
  // or the objective advancing, reporting a board the real game cannot produce.
  const neuronsLit = lightAdjacent(board, groups.flatMap((group) => group.cells));

  return { groups, cellsCleared, shadowPurified: purified, shadowDamaged: damaged, neuronsLit };
}

/**
 * Hit every shadow touching what just cleared, and turn the ones that break.
 *
 * A broken shadow gives back the tile it was standing on rather than leaving a
 * hole, and a restored tile can complete a group — so pushing the shadow back
 * can extend the chain that did it. This is the only way shadow leaves in play.
 *
 * The damage is the link's DEPTH: a single clear deals 1, so only a chain clears
 * a board the shadow has really taken hold of.
 *
 * ONE hit per shadow per link however many cleared cells touched it, hence the
 * set. Per adjacent cell instead would let a fat single clear out-damage a chain.
 */
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
    // Non-null by construction: nothing writes to the board between the scan
    // and here.
    const cell = board.pieceAt(column, row) as number;
    const was = shadowStrength(cell);
    const holding = shadowHolding(cell);
    const remaining = was - damage;

    board.clear(column, row);

    if (remaining <= 0) {
      // The tile it took, not the colour of whatever reached it.
      board.place(column, row, holding);
      purified.push({ column, row, strength: was, turnedTo: holding });
    } else {
      board.place(column, row, shadowCell(remaining, holding));
      damaged.push({ column, row, strength: remaining });
    }
  }

  return { purified, damaged };
}

/**
 * Settle, then clear: one link applied instantly. Settling first means a
 * floating tile can never be scored into a group it would not have belonged to
 * once gravity ran.
 */
export function resolveStep(board: Board, linkIndex = 0): ChainLink | null {
  board.settle();
  return clearStep(board, linkIndex);
}

/**
 * A whole cascade at once, one entry per link. `Simulation` steps through a
 * chain over time instead; this is here so tests can assert an outcome with no
 * clock.
 */
export function resolveChain(board: Board): ChainLink[] {
  const links: ChainLink[] = [];

  for (;;) {
    // Depth is damage, so the index travels here as it does through the timed
    // path.
    const link = resolveStep(board, links.length);
    if (link === null) {
      return links;
    }
    links.push(link);
  }
}

/**
 * `linkIndex` is 0-based, so each link scores at double the MULTIPLIER of the
 * last — not double the score, which also depends on how many tiles it cleared.
 * Exponential in depth rather than in tiles, because depth is the skill.
 *
 * PLACEHOLDER: the curve is untuned and has none of the colour or group bonuses
 * the genre's real formulas carry.
 */
export function scoreLink(link: ChainLink, linkIndex: number): number {
  return link.cellsCleared * 10 * 2 ** linkIndex;
}

export function scoreChain(links: ChainLink[]): number {
  return links.reduce((total, link, index) => total + scoreLink(link, index), 0);
}

/**
 * Flood fill through orthogonal neighbours of the same colour. Never enters the
 * hidden field, and iterative so a whole-board region cannot overflow the stack.
 *
 * Cells are marked visited when PUSHED, not when popped: marking on pop lets
 * several neighbours push the same cell before any is processed, counting it
 * twice and inflating both the group size and the score.
 */
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

      // Stops the fill leaking up into the hidden field and sweeping an inert
      // tile into an otherwise visible group.
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

/** A unique number per cell, so `visited` can be a `Set<number>`. */
function keyOf(column: number, row: number): number {
  return row * COLUMNS + column;
}
