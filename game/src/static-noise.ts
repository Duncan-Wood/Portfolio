const FAINTEST_ALPHA = 0.1;
const ALPHA_SPREAD = 0.14;

export interface StaticFrame {
  offsetX: number;
  offsetY: number;
  alpha: number;
}

export function staticFrame(
  strength: number,
  reducedMotion: boolean,
  random: () => number,
  size: number,
): StaticFrame {
  if (reducedMotion) {
    return { offsetX: 0, offsetY: 0, alpha: strength * (FAINTEST_ALPHA + ALPHA_SPREAD / 2) };
  }

  return {
    offsetX: random() * size,
    offsetY: random() * size,
    alpha: strength * (FAINTEST_ALPHA + random() * ALPHA_SPREAD),
  };
}
