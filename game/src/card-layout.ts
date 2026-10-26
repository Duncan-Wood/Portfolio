export interface FixedCardSizes {
  centerY: number;
  frameHeight: number;
  gap: number;
  titleHeight: number;
  tallestBody: number;
}

export interface FixedCardLayout {
  pictureY: number;
  titleY: number;
  bodyTop: number;
}

export function fixedCardLayout(sizes: FixedCardSizes): FixedCardLayout {
  const { centerY, frameHeight, gap, titleHeight, tallestBody } = sizes;
  const tallest = frameHeight + gap + titleHeight + gap + tallestBody;
  const top = centerY - tallest / 2;
  const titleTop = top + frameHeight + gap;
  const bodyTop = titleTop + titleHeight + gap;

  return {
    pictureY: top + frameHeight / 2,
    titleY: titleTop + titleHeight / 2,
    bodyTop,
  };
}
