export interface SkyPoint {
  x: number;
  y: number;
  bright: boolean;
}

export type SkyEdge = readonly [number, number];

export const SKY_POINTS: readonly SkyPoint[] = [
  { x: 0.22, y: 0.70, bright: true },
  { x: 0.38, y: 0.46, bright: true },
  { x: 0.52, y: 0.62, bright: true },
  { x: 0.66, y: 0.36, bright: true },
  { x: 0.80, y: 0.55, bright: true },
  { x: 0.90, y: 0.28, bright: true },
  { x: 0.12, y: 0.52, bright: false },
  { x: 0.30, y: 0.24, bright: false },
  { x: 0.72, y: 0.16, bright: false },
  { x: 0.94, y: 0.62, bright: false },
];

export const SKY_EDGES: readonly SkyEdge[] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [6, 0],
  [7, 1],
  [8, 3],
  [9, 4],
];

export function litEdges(found: readonly number[]): SkyEdge[] {
  return SKY_EDGES.filter(([from, to]) => found.includes(from) && found.includes(to));
}
