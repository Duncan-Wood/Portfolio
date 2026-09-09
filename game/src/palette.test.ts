import { describe, expect, it } from 'vitest';
import { PIECE_TYPE_COUNT } from './engine/grid';
import { PIECE_COLORS, PIECE_SHAPES } from './palette';

describe('the piece palette', () => {
  it('has exactly one colour per piece type', () => {
    expect(PIECE_COLORS).toHaveLength(PIECE_TYPE_COUNT);
  });

  it('gives every piece type a distinct colour', () => {
    expect(new Set(PIECE_COLORS).size).toBe(PIECE_COLORS.length);
  });

  it('has exactly one shape per piece type', () => {
    expect(PIECE_SHAPES).toHaveLength(PIECE_TYPE_COUNT);
  });

  it('gives every piece type a distinct shape', () => {
    expect(new Set(PIECE_SHAPES).size).toBe(PIECE_SHAPES.length);
  });
});
