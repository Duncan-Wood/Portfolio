import { describe, expect, it } from 'vitest';
import { PURSE_ART, PURSE_AT, PURSE_CENTER, PURSE_PALETTE, chainBetween } from './character-purse';

describe('the sunflower purse', () => {
  it('is a rectangle of pixels', () => {
    expect(new Set(PURSE_ART.map((row) => row.length)).size).toBe(1);
  });

  it('uses only colours it knows, or empty space', () => {
    for (const row of PURSE_ART) {
      for (const pixel of row) {
        expect(pixel === '.' || pixel in PURSE_PALETTE, pixel).toBe(true);
      }
    }
  });
});

describe('the chain strap', () => {
  it('runs from one end to the other, a pixel at a time', () => {
    const chain = chainBetween({ x: 18, y: 27 }, { x: 31, y: 37 });

    expect(chain[0]).toEqual({ x: 18, y: 27 });
    expect(chain[chain.length - 1]).toEqual({ x: 31, y: 37 });
  });

  it('never skips a pixel', () => {
    const chain = chainBetween({ x: 18, y: 27 }, { x: 31, y: 37 });

    for (let at = 1; at < chain.length; at += 1) {
      expect(Math.abs(chain[at].x - chain[at - 1].x)).toBeLessThanOrEqual(1);
      expect(Math.abs(chain[at].y - chain[at - 1].y)).toBeLessThanOrEqual(1);
    }
  });
});

describe('where the memories go into the purse', () => {
  it('is the middle of the purse as it hangs on the character', () => {
    expect(PURSE_CENTER.x).toBeGreaterThan(PURSE_AT.x);
    expect(PURSE_CENTER.x).toBeLessThan(PURSE_AT.x + PURSE_ART[0].length);
    expect(PURSE_CENTER.y).toBeGreaterThan(PURSE_AT.y);
    expect(PURSE_CENTER.y).toBeLessThan(PURSE_AT.y + PURSE_ART.length);
  });
});
