import { describe, expect, it } from 'vitest';
import { COLUMNS, PIECE_TYPE_COUNT, ROWS } from './grid';

describe('grid dimensions', () => {
  it('is six columns wide and twelve rows tall', () => {
    expect(COLUMNS).toBe(6);
    expect(ROWS).toBe(12);
  });

  it('has four piece types', () => {
    expect(PIECE_TYPE_COUNT).toBe(4);
  });
});
