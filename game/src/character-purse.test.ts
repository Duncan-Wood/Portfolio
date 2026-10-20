import { describe, expect, it } from 'vitest';
import { PURSE_ART, PURSE_PALETTE, chainBetween } from './character-purse';

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

  it('has a brass frame along the top, like the real one', () => {
    expect(PURSE_ART[0]).toBe('G'.repeat(PURSE_ART[0].length));
  });

  it('has sunflowers: yellow petals around a brown centre, on a black body', () => {
    const pixels = PURSE_ART.join('');

    expect(pixels).toContain('Y');
    expect(pixels).toContain('B');
    expect(pixels).toContain('K');
  });

  it('stays small enough not to crowd the character', () => {
    expect(PURSE_ART[0].length).toBeLessThanOrEqual(9);
    expect(PURSE_ART.length).toBeLessThanOrEqual(8);
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
