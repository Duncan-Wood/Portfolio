import { describe, expect, it } from 'vitest';
import {
  COLUMNS,
  FIRST_VISIBLE_ROW,
  HIDDEN_ROWS,
  PIECE_TYPE_COUNT,
  ROWS,
  VISIBLE_ROWS,
} from './grid';

describe('grid dimensions', () => {
  it('is six columns wide', () => {
    expect(COLUMNS).toBe(6);
  });

  it('shows twelve rows', () => {
    expect(VISIBLE_ROWS).toBe(12);
  });

  it('has one hidden row above them', () => {
    expect(HIDDEN_ROWS).toBe(1);
  });

  it('is the two added together', () => {
    expect(ROWS).toBe(VISIBLE_ROWS + HIDDEN_ROWS);
  });

  it('starts the visible field below the hidden rows', () => {
    expect(FIRST_VISIBLE_ROW).toBe(HIDDEN_ROWS);
  });

  it('has four piece types', () => {
    expect(PIECE_TYPE_COUNT).toBe(4);
  });
});
