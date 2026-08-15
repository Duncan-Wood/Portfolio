import { describe, expect, it } from 'vitest';
import { COLUMNS, ROWS } from './grid';
import { Board } from './board';
import { FallingPair, type Orientation } from './falling-pair';

const RED = 0;
const BLUE = 1;

const pairAt = (column: number, row: number, orientation: Orientation = 0) =>
  new FallingPair(column, row, orientation, RED, BLUE);

describe('the cells a pair occupies', () => {
  it('puts the satellite above the pivot when pointing up', () => {
    expect(pairAt(2, 5, 0).cells()).toEqual([
      { column: 2, row: 5, pieceType: RED },
      { column: 2, row: 4, pieceType: BLUE },
    ]);
  });

  it('puts the satellite right of the pivot when pointing right', () => {
    expect(pairAt(2, 5, 1).cells()[1]).toEqual({ column: 3, row: 5, pieceType: BLUE });
  });

  it('puts the satellite below the pivot when pointing down', () => {
    expect(pairAt(2, 5, 2).cells()[1]).toEqual({ column: 2, row: 6, pieceType: BLUE });
  });

  it('puts the satellite left of the pivot when pointing left', () => {
    expect(pairAt(2, 5, 3).cells()[1]).toEqual({ column: 1, row: 5, pieceType: BLUE });
  });
});

describe('moving sideways', () => {
  it('moves into empty space', () => {
    const board = new Board();
    const pair = pairAt(2, 5);
    expect(pair.moveLeft(board)).toBe(true);
    expect(pair.column).toBe(1);
    expect(pair.moveRight(board)).toBe(true);
    expect(pair.column).toBe(2);
  });

  it('refuses to move through the left wall', () => {
    const board = new Board();
    const pair = pairAt(0, 5);
    expect(pair.moveLeft(board)).toBe(false);
    expect(pair.column).toBe(0);
  });

  it('refuses to move through the right wall', () => {
    const board = new Board();
    const pair = pairAt(COLUMNS - 1, 5);
    expect(pair.moveRight(board)).toBe(false);
    expect(pair.column).toBe(COLUMNS - 1);
  });

  it('accounts for the satellite when checking the right wall', () => {
    const board = new Board();
    const pair = pairAt(COLUMNS - 2, 5, 1);
    expect(pair.moveRight(board)).toBe(false);
    expect(pair.column).toBe(COLUMNS - 2);
  });

  it('refuses to move into an occupied cell', () => {
    const board = new Board();
    board.place(1, 5, RED);
    const pair = pairAt(2, 5);
    expect(pair.moveLeft(board)).toBe(false);
    expect(pair.column).toBe(2);
  });

  it('allows moving above the top of the board', () => {
    const board = new Board();
    const pair = pairAt(2, 0);
    expect(pair.moveLeft(board)).toBe(true);
  });
});

describe('rotating', () => {
  it('cycles through the four orientations', () => {
    const board = new Board();
    const pair = pairAt(2, 5);
    pair.rotateClockwise(board);
    expect(pair.orientation).toBe(1);
    pair.rotateClockwise(board);
    expect(pair.orientation).toBe(2);
    pair.rotateClockwise(board);
    expect(pair.orientation).toBe(3);
    pair.rotateClockwise(board);
    expect(pair.orientation).toBe(0);
  });

  it('kicks away from the left wall instead of failing', () => {
    const board = new Board();
    const pair = pairAt(0, 5, 0);
    pair.rotateClockwise(board);
    pair.rotateClockwise(board);
    expect(pair.rotateClockwise(board)).toBe(true);
    expect(pair.orientation).toBe(3);
    expect(pair.column).toBe(1);
  });

  it('kicks away from the right wall instead of failing', () => {
    const board = new Board();
    const pair = pairAt(COLUMNS - 1, 5, 0);
    expect(pair.rotateClockwise(board)).toBe(true);
    expect(pair.orientation).toBe(1);
    expect(pair.column).toBe(COLUMNS - 2);
  });

  it('refuses to rotate when the kick is also blocked', () => {
    const board = new Board();
    board.place(COLUMNS - 2, 5, RED);
    const pair = pairAt(COLUMNS - 1, 5, 0);
    expect(pair.rotateClockwise(board)).toBe(false);
    expect(pair.orientation).toBe(0);
    expect(pair.column).toBe(COLUMNS - 1);
  });
});

describe('falling', () => {
  it('falls through empty space', () => {
    const board = new Board();
    const pair = pairAt(2, 5);
    expect(pair.canFall(board)).toBe(true);
    pair.fall(board);
    expect(pair.row).toBe(6);
  });

  it('cannot fall through the floor', () => {
    const board = new Board();
    const pair = pairAt(2, ROWS - 1, 0);
    expect(pair.canFall(board)).toBe(false);
  });

  it('cannot fall into an occupied cell', () => {
    const board = new Board();
    board.place(2, 6, RED);
    const pair = pairAt(2, 5);
    expect(pair.canFall(board)).toBe(false);
  });

  it('accounts for the satellite when it is the lower half', () => {
    const board = new Board();
    const pair = pairAt(2, ROWS - 2, 2);
    expect(pair.canFall(board)).toBe(false);
  });
});

describe('locking onto the board', () => {
  it('writes both halves onto the board', () => {
    const board = new Board();
    const pair = pairAt(2, ROWS - 1, 0);
    pair.lock(board);
    expect(board.pieceAt(2, ROWS - 1)).toBe(RED);
    expect(board.pieceAt(2, ROWS - 2)).toBe(BLUE);
  });

  it('lets the halves fall to different heights when one is unsupported', () => {
    const board = new Board();
    board.place(1, ROWS - 1, RED);
    const pair = pairAt(2, ROWS - 2, 3);
    pair.lock(board);
    expect(board.pieceAt(2, ROWS - 1)).toBe(RED);
    expect(board.pieceAt(1, ROWS - 2)).toBe(BLUE);
  });

  it('drops a pair that locks in mid-air down to the stack', () => {
    const board = new Board();
    const pair = pairAt(3, 4, 0);
    pair.lock(board);
    expect(board.pieceAt(3, ROWS - 1)).toBe(RED);
    expect(board.pieceAt(3, ROWS - 2)).toBe(BLUE);
  });
});
