import { describe, expect, it } from 'vitest';
import { fixedCardLayout } from './card-layout';

const base = { centerY: 450, frameHeight: 300, gap: 26, titleHeight: 30, tallestBody: 260 };

describe('laying out a card with a fixed picture frame', () => {
  it('puts the picture, title and text in that order, a gap apart', () => {
    const layout = fixedCardLayout(base);

    expect(layout.titleY - base.titleHeight / 2 - (layout.pictureY + base.frameHeight / 2)).toBe(base.gap);
    expect(layout.bodyTop - (layout.titleY + base.titleHeight / 2)).toBe(base.gap);
  });

  it('centres the block when the text is as long as it can be', () => {
    const layout = fixedCardLayout(base);
    const top = layout.pictureY - base.frameHeight / 2;
    const bottom = layout.bodyTop + base.tallestBody;

    expect((top + bottom) / 2).toBeCloseTo(base.centerY, 5);
  });
});
