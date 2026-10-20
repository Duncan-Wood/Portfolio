export interface FixedCardSizes {
  centerY: number;
  frameHeight: number;
  gap: number;
  titleHeight: number;
  bodyHeight: number;
  tallestBody: number;
  hintHeight: number;
}

export interface FixedCardLayout {
  pictureY: number;
  titleY: number;
  bodyTop: number;
  hintY: number;
}

export function fixedCardLayout(sizes: FixedCardSizes): FixedCardLayout {
  const { centerY, frameHeight, gap, titleHeight, bodyHeight, tallestBody, hintHeight } = sizes;
  const tallest = frameHeight + gap + titleHeight + gap + tallestBody + gap + hintHeight;
  const top = centerY - tallest / 2;
  const titleTop = top + frameHeight + gap;
  const bodyTop = titleTop + titleHeight + gap;

  return {
    pictureY: top + frameHeight / 2,
    titleY: titleTop + titleHeight / 2,
    bodyTop,
    hintY: bodyTop + bodyHeight + gap + hintHeight / 2,
  };
}
