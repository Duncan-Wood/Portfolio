import { COLUMNS, ROWS, isNeuron, isNeuronLit, neuronCell } from './grid';
import { Board } from './board';

/*
 * The neuron: what it is to reach one, and how to read them off a board.
 *
 * `game-pieces-1.jpg` gives the rule in one sentence — neurons are "activated
 * by popping an adjacent block" — and that sentence is the whole reason this
 * module exists. It makes the objective a PLACE rather than a total. Every
 * version of the progression before this one measured something (score, then
 * connections, then pads on a ring) and a measure can be filling toward
 * anything, which is why the writing it paid out always felt bolted on. You
 * cannot plan a route to a number.
 *
 * It is also the first thing in the game that makes a chain worth BUILDING
 * rather than worth points. One cascade can reach three neurons where three
 * separate clears reach three, but the cascade costs one piece instead of
 * three — and the budget is what turns that into a real decision.
 *
 * Pure, like the rest of `engine/`: functions take a `Board`, mutate it, and
 * return plain data.
 */

/**
 * Where a neuron looks for a clear that reaches it.
 *
 * The same four the match rule uses, and deliberately not a copy of them by
 * import: `matching.ts` depends on this module, so borrowing its constant back
 * would make the two mutually dependent to share four vectors. Diagonals are
 * absent for the reason they are absent from matching — corner contact is not
 * something a player reads at a glance, so a neuron lighting from a diagonal
 * would look like it lit for no reason.
 */
const NEIGHBOURS = [
  { column: 0, row: -1 },
  { column: 1, row: 0 },
  { column: 0, row: 1 },
  { column: -1, row: 0 },
];

/** A neuron's place on the board. */
export interface NeuronSite {
  column: number;
  row: number;
}

/**
 * Light every unlit neuron touching one of `cleared`, and report which.
 *
 * ONE entry per neuron however many of the cleared cells were beside it, which
 * is the same rule `damageShadow` holds itself to and for the same reason: a
 * fat clear in a pocket must not out-earn a chain, or the mechanic argues
 * against the thing it exists to reward.
 *
 * `cleared` is a flat list of coordinates rather than the `Group[]` the caller
 * has, so this module needs nothing from `matching.ts` — the dependency runs
 * one way, and these functions stay callable from a test that has never built
 * a group.
 */
export function lightAdjacent(board: Board, cleared: readonly NeuronSite[]): NeuronSite[] {
  const reached = new Map<number, NeuronSite>();

  for (const cell of cleared) {
    for (const step of NEIGHBOURS) {
      const column = cell.column + step.column;
      const row = cell.row + step.row;
      const piece = board.pieceAt(column, row);

      if (isNeuron(piece) && !isNeuronLit(piece)) {
        reached.set(row * COLUMNS + column, { column, row });
      }
    }
  }

  for (const { column, row } of reached.values()) {
    board.clear(column, row);
    board.place(column, row, neuronCell(true));
  }

  return [...reached.values()];
}

/** Every neuron on the board, lit or not, in reading order. */
export function neuronsOn(board: Board): NeuronSite[] {
  const found: NeuronSite[] = [];

  for (let row = 0; row < ROWS; row += 1) {
    for (let column = 0; column < COLUMNS; column += 1) {
      if (isNeuron(board.pieceAt(column, row))) {
        found.push({ column, row });
      }
    }
  }

  return found;
}

/** How many are still dark — what the objective is counting down. */
export function unlitCount(board: Board): number {
  return neuronsOn(board)
    .filter(({ column, row }) => !isNeuronLit(board.pieceAt(column, row) as number))
    .length;
}

/**
 * Whether this board has been solved.
 *
 * A board with NO neurons on it is not solved, and that is a deliberate
 * asymmetry rather than an oversight. "Every neuron is lit" is vacuously true
 * of an empty board, so the naive predicate would report the objective
 * complete the instant a board was reset and before it had been seeded — a
 * failure that would surface as a memory paying out for nothing.
 */
export function allLit(board: Board): boolean {
  const neurons = neuronsOn(board);
  return neurons.length > 0
    && neurons.every(({ column, row }) => isNeuronLit(board.pieceAt(column, row) as number));
}
