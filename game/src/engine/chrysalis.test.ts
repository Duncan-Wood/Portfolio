import { describe, expect, it } from 'vitest';
import { ROWS, chrysalisCell, isChrysalis } from './grid';
import { Board } from './board';
import { chrysalisOn, freeAdjacent } from './chrysalis';

const BOTTOM = ROWS - 1;

const withChrysalis = (column: number, row: number): Board => {
  const board = new Board();
  board.place(column, row, chrysalisCell());
  return board;
};

describe('freeing a butterfly', () => {
  it('opens one an orthogonal neighbour of a cleared cell', () => {
    const board = withChrysalis(2, BOTTOM);

    const freed = freeAdjacent(board, [{ column: 3, row: BOTTOM }]);

    expect(freed).toEqual([{ column: 2, row: BOTTOM }]);
  });

  it('leaves the board once it is free, rather than sitting there opened', () => {
    const board = withChrysalis(2, BOTTOM);

    freeAdjacent(board, [{ column: 3, row: BOTTOM }]);

    expect(board.pieceAt(2, BOTTOM)).toBeNull();
    expect(chrysalisOn(board)).toBeNull();
  });

  it('ignores a diagonal, so a clear has to actually reach it', () => {
    const board = withChrysalis(2, BOTTOM);

    expect(freeAdjacent(board, [{ column: 3, row: BOTTOM - 1 }])).toEqual([]);
    expect(isChrysalis(board.pieceAt(2, BOTTOM))).toBe(true);
  });

  it('frees nothing when a clear lands nowhere near it', () => {
    const board = withChrysalis(0, BOTTOM);

    expect(freeAdjacent(board, [{ column: 5, row: BOTTOM }])).toEqual([]);
  });

  it('reports it once even when a clear surrounds it', () => {
    const board = withChrysalis(2, BOTTOM);

    const freed = freeAdjacent(board, [
      { column: 1, row: BOTTOM },
      { column: 3, row: BOTTOM },
      { column: 2, row: BOTTOM - 1 },
    ]);

    expect(freed).toEqual([{ column: 2, row: BOTTOM }]);
  });
});

describe('finding the chrysalis on a board', () => {
  it('reports where it is', () => {
    expect(chrysalisOn(withChrysalis(4, BOTTOM - 2))).toEqual({ column: 4, row: BOTTOM - 2 });
  });

  it('reports none on a board that never had one', () => {
    expect(chrysalisOn(new Board())).toBeNull();
  });
});
