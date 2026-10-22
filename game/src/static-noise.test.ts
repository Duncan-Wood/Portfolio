import { describe, expect, it } from 'vitest';
import { staticFrame } from './static-noise';

const SIZE = 96;
const sequence = (...values: number[]) => {
  let index = 0;
  return () => values[index++ % values.length];
};

describe('how the static on a lost board looks from one frame to the next', () => {
  it('jumps to a new place and a new brightness every frame, as static does', () => {
    const first = staticFrame(1, false, sequence(0.1, 0.2, 0.3), SIZE);
    const second = staticFrame(1, false, sequence(0.7, 0.8, 0.9), SIZE);

    expect(first).not.toEqual(second);
  });

  it('stays within the same range of brightness as it always has, scaled by how far in it has faded', () => {
    const faintest = staticFrame(1, false, sequence(0, 0, 0), SIZE).alpha;
    const brightest = staticFrame(1, false, sequence(0, 0, 0.999999), SIZE).alpha;
    const halfway = staticFrame(0.5, false, sequence(0, 0, 0), SIZE).alpha;

    expect(faintest).toBeCloseTo(0.1);
    expect(brightest).toBeCloseTo(0.24, 3);
    expect(halfway).toBeCloseTo(0.05);
  });

  it('is a still picture when the visitor asks for reduced motion, whatever the random numbers say', () => {
    const first = staticFrame(1, true, sequence(0.1, 0.2, 0.3), SIZE);
    const second = staticFrame(1, true, sequence(0.7, 0.8, 0.9), SIZE);

    expect(first).toEqual(second);
    expect(first.offsetX).toBe(0);
    expect(first.offsetY).toBe(0);
  });

  it('still fades in under reduced motion, so the loss is not hidden', () => {
    const none = staticFrame(0, true, Math.random, SIZE).alpha;
    const half = staticFrame(0.5, true, Math.random, SIZE).alpha;
    const full = staticFrame(1, true, Math.random, SIZE).alpha;

    expect(none).toBe(0);
    expect(half).toBeGreaterThan(none);
    expect(full).toBeGreaterThan(half);
  });

  it('never gets brighter under reduced motion than the full effect can', () => {
    expect(staticFrame(1, true, Math.random, SIZE).alpha).toBeLessThanOrEqual(0.24);
  });
});
