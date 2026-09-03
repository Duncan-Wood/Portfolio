import { COLUMNS, ROWS, isNeuron, isNeuronLit, neuronCell } from './grid';
import { Board } from './board';

/*
 * The neuron: lit by popping a block beside it, which makes the objective a
 * PLACE rather than a total. One cascade can reach three for the price of one
 * piece, which is what makes a chain worth building rather than worth points.
 */

/**
 * Deliberately not imported from `matching.ts`, which depends on this module:
 * borrowing the constant back would make the two mutually dependent.
 */
const NEIGHBOURS = [
  { column: 0, row: -1 },
  { column: 1, row: 0 },
  { column: 0, row: 1 },
  { column: -1, row: 0 },
];

export interface NeuronSite {
  column: number;
  row: number;
}

/**
 * Light every unlit neuron touching one of `cleared`, and report which.
 *
 * ONE entry per neuron however many cleared cells were beside it, the same rule
 * `damageShadow` holds to: a fat clear in a pocket must not out-earn a chain.
 *
 * `cleared` is a flat list rather than the `Group[]` the caller holds, so the
 * dependency on `matching.ts` runs one way only.
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
 * Whether this board has been solved. A board with NO neurons is deliberately
 * not solved: "every neuron is lit" is vacuously true of an empty one, which
 * would report the objective complete between a reset and its seeding.
 */
export function allLit(board: Board): boolean {
  const neurons = neuronsOn(board);
  return neurons.length > 0
    && neurons.every(({ column, row }) => isNeuronLit(board.pieceAt(column, row) as number));
}
