export interface Pixel {
  x: number;
  y: number;
}

export const PURSE_PALETTE: Readonly<Record<string, number>> = {
  G: 0xc9a64b,
  K: 0x15111f,
  Y: 0xf2b705,
  O: 0xe07a1f,
  B: 0x7a2a1a,
  L: 0x6fae4a,
};

export const CHAIN_COLOR = 0x9a7b3c;

export const PURSE_ART: readonly string[] = [
  'GGGGGGGG',
  'KKKKKKKK',
  'KYYYKKLK',
  'KYBYKYOK',
  'KYYYKYYK',
  'KKLKKKKK',
  '.KKKKKK.',
];

export function chainBetween(from: Pixel, to: Pixel): Pixel[] {
  const steps = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y));

  return Array.from({ length: steps + 1 }, (_, step) => ({
    x: Math.round(from.x + ((to.x - from.x) * step) / steps),
    y: Math.round(from.y + ((to.y - from.y) * step) / steps),
  }));
}
