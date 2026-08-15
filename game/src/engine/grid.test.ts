import { describe, expect, it } from 'vitest';
import { COLUMNS, PIECE_TYPE_COUNT, ROWS, pieceTypeAt } from './grid';

describe('grid dimensions', () => {
  it('is six columns wide and twelve rows tall', () => {
    expect(COLUMNS).toBe(6);
    expect(ROWS).toBe(12);
  });
});

describe('pieceTypeAt', () => {
  it('returns an in-range piece type for every cell', () => {
    for (let column = 0; column < COLUMNS; column += 1) {
      for (let row = 0; row < ROWS; row += 1) {
        const pieceType = pieceTypeAt(column, row);
        expect(Number.isInteger(pieceType)).toBe(true);
        expect(pieceType).toBeGreaterThanOrEqual(0);
        expect(pieceType).toBeLessThan(PIECE_TYPE_COUNT);
      }
    }
  });

  it('returns the same piece type when called repeatedly', () => {
    expect(pieceTypeAt(3, 7)).toBe(pieceTypeAt(3, 7));
  });

  it('distinguishes a step along a column from a step along a row', () => {
    expect(pieceTypeAt(0, 0)).not.toBe(pieceTypeAt(0, 1));
    expect(pieceTypeAt(0, 0)).not.toBe(pieceTypeAt(1, 0));
  });

  it('places matching piece types on a diagonal', () => {
    expect(pieceTypeAt(0, 1)).toBe(pieceTypeAt(1, 0));
    expect(pieceTypeAt(2, 3)).toBe(pieceTypeAt(3, 2));
  });

  it('throws when the column is outside the board', () => {
    expect(() => pieceTypeAt(-1, 0)).toThrow();
    expect(() => pieceTypeAt(COLUMNS, 0)).toThrow();
  });

  it('throws when the row is outside the board', () => {
    expect(() => pieceTypeAt(0, -1)).toThrow();
    expect(() => pieceTypeAt(0, ROWS)).toThrow();
  });

  it('throws when a coordinate is not a whole number', () => {
    expect(() => pieceTypeAt(1.5, 0)).toThrow();
    expect(() => pieceTypeAt(0, 1.5)).toThrow();
  });
});
