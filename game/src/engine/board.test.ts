import { describe, expect, it } from 'vitest';
import { COLUMNS, ROWS } from './grid';
import { Board } from './board';

const BOTTOM = ROWS - 1;

describe('a new board', () => {
  it('is empty in every cell', () => {
    const board = new Board();
    for (let column = 0; column < COLUMNS; column += 1) {
      for (let row = 0; row < ROWS; row += 1) {
        expect(board.isEmpty(column, row)).toBe(true);
        expect(board.pieceAt(column, row)).toBeNull();
      }
    }
  });
});

describe('bounds', () => {
  it('treats cells inside the grid as inside', () => {
    const board = new Board();
    expect(board.isInside(0, 0)).toBe(true);
    expect(board.isInside(COLUMNS - 1, BOTTOM)).toBe(true);
  });

  it('treats cells outside the grid as outside', () => {
    const board = new Board();
    expect(board.isInside(-1, 0)).toBe(false);
    expect(board.isInside(COLUMNS, 0)).toBe(false);
    expect(board.isInside(0, ROWS)).toBe(false);
  });

  it('reports the ceiling as blocked, like any other edge', () => {
    const board = new Board();
    expect(board.isInside(0, -1)).toBe(false);
    expect(board.isBlocked(0, -1)).toBe(true);
  });

  it('refuses to place a piece on top of another', () => {
    const board = new Board();
    board.place(2, 5, 3);
    expect(() => board.place(2, 5, 4)).toThrow();
    expect(board.pieceAt(2, 5)).toBe(3);
  });

  it('reports walls and the floor as blocked', () => {
    const board = new Board();
    expect(board.isBlocked(-1, 0)).toBe(true);
    expect(board.isBlocked(COLUMNS, 0)).toBe(true);
    expect(board.isBlocked(0, ROWS)).toBe(true);
  });

  it('refuses to place a piece outside the grid', () => {
    const board = new Board();
    expect(() => board.place(-1, 0, 2)).toThrow();
    expect(() => board.place(0, ROWS, 2)).toThrow();
  });
});

describe('placing pieces', () => {
  it('stores the piece type at the cell', () => {
    const board = new Board();
    board.place(2, 5, 3);
    expect(board.pieceAt(2, 5)).toBe(3);
    expect(board.isEmpty(2, 5)).toBe(false);
    expect(board.isBlocked(2, 5)).toBe(true);
  });

  it('leaves neighbouring cells untouched', () => {
    const board = new Board();
    board.place(2, 5, 3);
    expect(board.isEmpty(1, 5)).toBe(true);
    expect(board.isEmpty(3, 5)).toBe(true);
    expect(board.isEmpty(2, 4)).toBe(true);
    expect(board.isEmpty(2, 6)).toBe(true);
  });

  it('stores piece type 0 as a piece rather than as empty', () => {
    const board = new Board();
    board.place(1, 1, 0);
    expect(board.pieceAt(1, 1)).toBe(0);
    expect(board.isEmpty(1, 1)).toBe(false);
  });
});

describe('settle', () => {
  it('drops a floating piece to the floor', () => {
    const board = new Board();
    board.place(3, 0, 4);
    board.settle();
    expect(board.isEmpty(3, 0)).toBe(true);
    expect(board.pieceAt(3, BOTTOM)).toBe(4);
  });

  it('stacks pieces in a column without leaving gaps', () => {
    const board = new Board();
    board.place(1, 0, 1);
    board.place(1, 5, 2);
    board.settle();
    expect(board.pieceAt(1, BOTTOM)).toBe(2);
    expect(board.pieceAt(1, BOTTOM - 1)).toBe(1);
    expect(board.isEmpty(1, BOTTOM - 2)).toBe(true);
  });

  it('leaves an already settled column alone', () => {
    const board = new Board();
    board.place(0, BOTTOM, 5);
    board.place(0, BOTTOM - 1, 6);
    board.settle();
    expect(board.pieceAt(0, BOTTOM)).toBe(5);
    expect(board.pieceAt(0, BOTTOM - 1)).toBe(6);
  });

  it('never moves a piece into another column', () => {
    const board = new Board();
    board.place(4, 2, 1);
    board.settle();
    expect(board.pieceAt(4, BOTTOM)).toBe(1);
    for (let row = 0; row < ROWS; row += 1) {
      expect(board.isEmpty(3, row)).toBe(true);
      expect(board.isEmpty(5, row)).toBe(true);
    }
  });
});

describe('clearing cells', () => {
  it('empties a cell that held a piece', () => {
    const board = new Board();
    board.place(2, BOTTOM, 3);
    board.clear(2, BOTTOM);
    expect(board.isEmpty(2, BOTTOM)).toBe(true);
  });

  it('leaves neighbouring cells untouched', () => {
    const board = new Board();
    board.place(2, BOTTOM, 3);
    board.place(3, BOTTOM, 1);
    board.clear(2, BOTTOM);
    expect(board.pieceAt(3, BOTTOM)).toBe(1);
  });

  it('refuses to clear a cell outside the grid', () => {
    expect(() => new Board().clear(0, ROWS)).toThrow();
  });
});

describe('reporting what settling moved', () => {
  it('reports nothing when every column is already packed', () => {
    const board = new Board();
    board.place(0, BOTTOM, 3);
    board.place(0, BOTTOM - 1, 4);
    expect(board.settle()).toEqual([]);
  });

  it('reports each tile that fell, bottom-most first', () => {
    const board = new Board();
    board.place(0, 5, 3);
    board.place(0, 10, 4);

    expect(board.settle()).toEqual([
      { column: 0, fromRow: 10, toRow: BOTTOM },
      { column: 0, fromRow: 5, toRow: BOTTOM - 1 },
    ]);
  });

  it('leaves tiles that did not move out of the report', () => {
    const board = new Board();
    board.place(1, BOTTOM, 3);
    board.place(1, 4, 4);

    expect(board.settle()).toEqual([{ column: 1, fromRow: 4, toRow: BOTTOM - 1 }]);
  });
});

describe('resetting', () => {
  it('empties every cell', () => {
    const board = new Board();
    board.place(0, BOTTOM, 3);
    board.place(4, 2, 5);

    board.reset();

    expect(board.isEmpty(0, BOTTOM)).toBe(true);
    expect(board.isEmpty(4, 2)).toBe(true);
  });

  it('leaves the board usable afterwards', () => {
    const board = new Board();
    board.place(0, BOTTOM, 3);
    board.reset();

    expect(() => board.place(0, BOTTOM, 4)).not.toThrow();
    expect(board.pieceAt(0, BOTTOM)).toBe(4);
  });
});
