import { describe, expect, it } from 'vitest';
import { ROWS, isNeuronLit, neuronCell } from './grid';
import { Board } from './board';
import { allLit, lightAdjacent, neuronsOn, unlitCount } from './neurons';

const BOTTOM = ROWS - 1;

const withNeuron = (column: number, row: number, lit = false): Board => {
  const board = new Board();
  board.place(column, row, neuronCell(lit));
  return board;
};

describe('lighting a neuron', () => {
  it('lights one an orthogonal neighbour of a cleared cell', () => {
    const board = withNeuron(2, BOTTOM);

    const lit = lightAdjacent(board, [{ column: 3, row: BOTTOM }]);

    expect(lit).toEqual([{ column: 2, row: BOTTOM }]);
    expect(isNeuronLit(board.pieceAt(2, BOTTOM) as number)).toBe(true);
  });

  it('does NOT light one touching only at a corner', () => {
    const board = withNeuron(2, BOTTOM);

    const lit = lightAdjacent(board, [{ column: 3, row: BOTTOM - 1 }]);

    expect(lit).toEqual([]);
    expect(isNeuronLit(board.pieceAt(2, BOTTOM) as number)).toBe(false);
  });

  it('lights every neuron the same clear reached', () => {
    const board = new Board();
    board.place(1, BOTTOM, neuronCell(false));
    board.place(3, BOTTOM, neuronCell(false));

    const lit = lightAdjacent(board, [{ column: 2, row: BOTTOM }]);

    expect(lit).toHaveLength(2);
    expect(unlitCount(board)).toBe(0);
  });

  it('reports a neuron once however many cleared cells touched it', () => {
    const board = withNeuron(2, BOTTOM);

    const lit = lightAdjacent(board, [
      { column: 1, row: BOTTOM },
      { column: 3, row: BOTTOM },
      { column: 2, row: BOTTOM - 1 },
    ]);

    expect(lit).toHaveLength(1);
  });

  it('does not report one that was already lit', () => {
    const board = withNeuron(2, BOTTOM, true);

    expect(lightAdjacent(board, [{ column: 3, row: BOTTOM }])).toEqual([]);
  });

  it('leaves a neuron nothing reached alone', () => {
    const board = withNeuron(0, 0);

    expect(lightAdjacent(board, [{ column: 5, row: BOTTOM }])).toEqual([]);
    expect(unlitCount(board)).toBe(1);
  });

  it('ignores a cleared cell against the wall without falling off the board', () => {
    const board = withNeuron(0, BOTTOM);

    expect(lightAdjacent(board, [{ column: 0, row: BOTTOM - 1 }])).toHaveLength(1);
  });
});

describe('reading the neurons on a board', () => {
  it('finds every one, lit or not', () => {
    const board = new Board();
    board.place(0, BOTTOM, neuronCell(true));
    board.place(4, BOTTOM - 2, neuronCell(false));
    board.place(5, BOTTOM, 1);

    expect(neuronsOn(board)).toHaveLength(2);
    expect(unlitCount(board)).toBe(1);
  });

  it('calls a board solved only once every neuron on it is lit', () => {
    const board = new Board();
    board.place(0, BOTTOM, neuronCell(false));
    board.place(4, BOTTOM, neuronCell(true));

    expect(allLit(board)).toBe(false);

    lightAdjacent(board, [{ column: 1, row: BOTTOM }]);

    expect(allLit(board)).toBe(true);
  });

  it('never calls a board with no neurons on it solved', () => {
    expect(allLit(new Board())).toBe(false);
  });
});
