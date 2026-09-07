import { COLUMNS, ROWS, isNeuron, isNeuronLit, neuronCell } from './grid';
import { Board } from './board';

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

export function unlitCount(board: Board): number {
  return neuronsOn(board)
    .filter(({ column, row }) => !isNeuronLit(board.pieceAt(column, row) as number))
    .length;
}

export function allLit(board: Board): boolean {
  const neurons = neuronsOn(board);
  return neurons.length > 0
    && neurons.every(({ column, row }) => isNeuronLit(board.pieceAt(column, row) as number));
}
