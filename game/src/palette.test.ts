import { describe, expect, it } from 'vitest';
import { PIECE_TYPE_COUNT } from './engine/grid';
import { PIECE_COLORS } from './palette';

describe('the piece palette', () => {
  it('has exactly one colour per piece type', () => {
    expect(PIECE_COLORS).toHaveLength(PIECE_TYPE_COUNT);
  });

  it('gives every piece type a distinct colour', () => {
    expect(new Set(PIECE_COLORS).size).toBe(PIECE_COLORS.length);
  });
});
