import { describe, expect, it } from 'vitest';
import { revealOrder } from './memory-reveal';

describe('the order a memory surfaces in', () => {
  it('covers every cell exactly once', () => {
    const order = revealOrder(6, 5);
    expect(order).toHaveLength(30);
    expect(new Set(order).size).toBe(30);
    expect(Math.min(...order)).toBe(0);
    expect(Math.max(...order)).toBe(29);
  });

  it('is the same every time, so a memory surfaces the same way twice', () => {
    expect(revealOrder(9, 7)).toEqual(revealOrder(9, 7));
  });

  it('starts near the middle and works outward', () => {
    const columns = 11;
    const rows = 11;
    const order = revealOrder(columns, rows);
    const distance = (cell: number) => Math.hypot(
      (cell % columns) - (columns - 1) / 2,
      Math.floor(cell / columns) - (rows - 1) / 2,
    );

    const firstTen = order.slice(0, 10).map(distance);
    const lastTen = order.slice(-10).map(distance);
    const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;

    expect(mean(firstTen)).toBeLessThan(mean(lastTen));
  });

  it('does not spread as a clean circle, so the front stays ragged', () => {
    const columns = 15;
    const rows = 15;
    const order = revealOrder(columns, rows);
    const distance = (cell: number) => Math.hypot(
      (cell % columns) - 7,
      Math.floor(cell / columns) - 7,
    );

    let inversions = 0;
    for (let index = 1; index < order.length; index += 1) {
      if (distance(order[index]) < distance(order[index - 1])) {
        inversions += 1;
      }
    }

    expect(inversions).toBeGreaterThan(order.length * 0.1);
  });

  it('handles a single cell', () => {
    expect(revealOrder(1, 1)).toEqual([0]);
  });
});
