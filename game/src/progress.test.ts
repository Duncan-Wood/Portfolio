import { describe, expect, it } from 'vitest';
import { furthestFragment } from './progress';

describe('furthestFragment', () => {
  it('keeps the best run when this one fell short', () => {
    expect(furthestFragment(3, 1, 4)).toBe(3);
  });

  it('advances when this run went further', () => {
    expect(furthestFragment(1, 3, 4)).toBe(3);
  });

  it('starts from nothing remembered', () => {
    expect(furthestFragment(0, 2, 4)).toBe(2);
  });

  it('caps a mark set when the game had more fragments than it has now', () => {
    expect(furthestFragment(6, 1, 4)).toBe(4);
  });

  it('lets this run beat a capped mark', () => {
    expect(furthestFragment(6, 4, 4)).toBe(4);
  });
});
