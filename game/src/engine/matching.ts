import { Board } from './board';
import { COLUMNS, FIRST_VISIBLE_ROW, ROWS, SHADOW, isColour } from './grid';

/*
 * The match rule and the cascade: what counts as a group, what clearing does,
 * and how a chain scores.
 *
 * The rule is Puyo's: four or more same-coloured tiles touching orthogonally,
 * in ANY shape. Not lines. That was chosen over match-3 lines because the art
 * direction's core image is a network — chains lighting the leading between
 * tiles should read as a signal crossing a graph, and a connected blob is a
 * graph while a row of three is not. This accepts the design plan's warning
 * that Puyo-style chain-building is hard for newcomers.
 *
 * Everything here is pure: functions take a `Board`, mutate it, and return
 * plain data. No Phaser, no timers, no randomness — which is why the whole rule
 * set is testable from ASCII pictures of boards.
 */

/**
 * How many connected tiles are needed to clear. Four is Puyo standard.
 * Lowering it to three makes clears far more frequent and setups shallower.
 */
export const MATCH_SIZE = 4;

/**
 * The four orthogonal neighbours. Diagonals are deliberately absent — tiles
 * touching corner-to-corner do NOT connect, which is what makes group shapes
 * readable at a glance.
 */
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

/** One set of connected same-coloured tiles that is large enough to clear. */
export interface Group {
  pieceType: number;
  cells: GroupCell[];
}

/**
 * One step of a cascade: everything that cleared simultaneously.
 *
 * `groups` (with per-cell coordinates) exists so the scene can eventually
 * animate each link separately — which tiles popped, and where. `cellsCleared`
 * is the total, used for scoring.
 *
 * `shadowCleared` is what this link drove off the board, which is not
 * recoverable afterwards: the cells are empty by the time anything reads them,
 * and a shadow that was pushed back looks exactly like a shadow that was never
 * there.
 */
export interface ChainLink {
  groups: Group[];
  cellsCleared: number;
  shadowCleared: GroupCell[];
}

export function findGroups(board: Board): Group[] {
  const visited = new Set<number>();
  const groups: Group[] = [];

  // Starts at the first VISIBLE row: a tile resting in the hidden field is
  // inert. It neither forms a group of its own nor joins one below it, so the
  // player never sees tiles vanish because of something they cannot see.
  for (let row = FIRST_VISIBLE_ROW; row < ROWS; row += 1) {
    for (let column = 0; column < COLUMNS; column += 1) {
      const pieceType = board.pieceAt(column, row);

      // A colourless occupant can never be part of a group, which is precisely
      // why the shadow has to be cleared by something happening NEXT to it
      // rather than by being matched.
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
 * Clear every group currently on the board, WITHOUT applying gravity.
 *
 * The missing settle is the whole point. Leaving the holes open for a beat
 * before tiles drop is what makes a cascade legible: you see the gap appear,
 * then you see things fall into it, so the cause and the effect are separate
 * moments. When clearing and settling happened together the entire chain was
 * imperceptible.
 *
 * Returns `null` when nothing matched, which is how callers detect that a
 * cascade has finished.
 */
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

  return { groups, cellsCleared, shadowCleared: pushBackShadow(board, groups) };
}

/**
 * Clear any shadow touching what just cleared.
 *
 * Shadow cannot be matched, so this is the only way it ever leaves — the rule
 * ART-DIRECTION asked for, *shadow recedes from light*, and the reason a board
 * full of it is one you have to play out of rather than one you have already
 * lost.
 *
 * Here, inside the clearing step, rather than one layer up in `Simulation`.
 * This file's header says it owns what clearing DOES, and it owns the only
 * definition of what "touching" means. With the rule sitting above `clearStep`
 * instead, every other path into it — `resolveStep`, `resolveChain`, and the
 * tests built on them — cleared groups without the shadow ever receding, and
 * reported a board the real game would never produce.
 */
function pushBackShadow(board: Board, groups: Group[]): GroupCell[] {
  const pushed: GroupCell[] = [];

  for (const group of groups) {
    for (const cell of group.cells) {
      for (const step of NEIGHBOURS) {
        const column = cell.column + step.column;
        const row = cell.row + step.row;

        if (board.isInside(column, row) && board.pieceAt(column, row) === SHADOW) {
          board.clear(column, row);
          pushed.push({ column, row });
        }
      }
    }
  }

  return pushed;
}

/**
 * Settle, then clear. One complete link of a cascade applied instantly.
 *
 * Settling FIRST matters: it guarantees the board is at rest before groups are
 * looked for, so a floating tile can never be scored as part of a group it
 * would not have belonged to once gravity ran.
 */
export function resolveStep(board: Board): ChainLink | null {
  board.settle();
  return clearStep(board);
}

/**
 * Run an entire cascade to completion immediately, returning one entry per
 * link.
 *
 * `Simulation` no longer uses this — it steps through a chain over time so the
 * player can watch it. This remains because it expresses the rule "keep
 * clearing until nothing matches" in one place, and tests can assert the final
 * outcome of a chain without simulating any clock.
 */
export function resolveChain(board: Board): ChainLink[] {
  const links: ChainLink[] = [];

  for (;;) {
    const link = resolveStep(board);
    if (link === null) {
      return links;
    }
    links.push(link);
  }
}

/**
 * Score for one link. `linkIndex` is 0-based, so each successive link in a
 * cascade scores at double the MULTIPLIER of the previous one — not double the
 * score, since that also depends on how many tiles the link cleared.
 *
 * Exponential in chain DEPTH rather than in tiles cleared, because depth is the
 * skill: clearing eight tiles at once is easy, whereas arranging for one clear
 * to trigger another is the thing worth rewarding. A 3-link chain of 4 tiles
 * each scores 40 + 80 + 160 = 280, versus 120 for the same twelve tiles cleared
 * separately.
 *
 * Deliberately a placeholder — Puyo's real formula adds a chain power table
 * plus colour and group bonuses. The property that matters (exponential in
 * depth) is here; the exact curve is not tuned.
 */
export function scoreLink(link: ChainLink, linkIndex: number): number {
  return link.cellsCleared * 10 * 2 ** linkIndex;
}

export function scoreChain(links: ChainLink[]): number {
  return links.reduce((total, link, index) => total + scoreLink(link, index), 0);
}

/**
 * Flood fill: every cell reachable from a starting cell through orthogonal
 * neighbours of the same colour.
 *
 * Iterative with an explicit stack rather than recursive, so a region spanning
 * the whole board cannot overflow the call stack.
 *
 * Never enters the hidden field — see `findGroups`.
 *
 * Cells are marked visited when they are PUSHED, not when they are popped.
 * Marking on pop would let the same cell be pushed several times by different
 * neighbours before any of them is processed, and it would then be counted more
 * than once — inflating the group size and the score.
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

      // `row < FIRST_VISIBLE_ROW` stops the fill leaking upward into the hidden
      // field, which is what keeps an inert tile from being swept into a group
      // that is otherwise entirely visible.
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

/**
 * A unique number per cell, so `visited` can be a `Set<number>` instead of a
 * set of objects or strings (which would compare by identity, or allocate).
 *
 * This mirrors `Board`'s internal index arithmetic, but it is not coupled to
 * it: any function producing one distinct number per cell would work equally
 * well here.
 */
function keyOf(column: number, row: number): number {
  return row * COLUMNS + column;
}
