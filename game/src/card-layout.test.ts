import { describe, expect, it } from 'vitest';
import { fixedCardLayout } from './card-layout';

const base = { centerY: 450, frameHeight: 300, gap: 26, titleHeight: 30, tallestBody: 260, hintHeight: 16 };

describe('laying out a card with a fixed picture frame', () => {
  it('keeps the picture and title where they are however short the text is', () => {
    const long = fixedCardLayout({ ...base, bodyHeight: 260 });
    const short = fixedCardLayout({ ...base, bodyHeight: 100 });

    expect(short.pictureY).toBe(long.pictureY);
    expect(short.titleY).toBe(long.titleY);
    expect(short.bodyTop).toBe(long.bodyTop);
  });

  it('puts the picture, title, text and hint in that order, a gap apart', () => {
    const layout = fixedCardLayout({ ...base, bodyHeight: 100 });

    expect(layout.titleY - base.titleHeight / 2 - (layout.pictureY + base.frameHeight / 2)).toBe(base.gap);
    expect(layout.bodyTop - (layout.titleY + base.titleHeight / 2)).toBe(base.gap);
    expect(layout.hintY - base.hintHeight / 2 - (layout.bodyTop + 100)).toBe(base.gap);
  });

  it('centres the block when the text is as long as it can be', () => {
    const layout = fixedCardLayout({ ...base, bodyHeight: 260 });
    const top = layout.pictureY - base.frameHeight / 2;
    const bottom = layout.hintY + base.hintHeight / 2;

    expect((top + bottom) / 2).toBeCloseTo(base.centerY, 5);
  });
});
