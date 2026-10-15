export interface SkyPoint {
  x: number;
  y: number;
  bright: boolean;
}

export type SkyEdge = readonly [number, number];

export const SKY_POINTS: readonly SkyPoint[] = [
  { x: 0.10, y: 0.62, bright: true },
  { x: 0.21, y: 0.42, bright: true },
  { x: 0.31, y: 0.66, bright: true },
  { x: 0.43, y: 0.48, bright: true },
  { x: 0.55, y: 0.70, bright: true },
  { x: 0.66, y: 0.44, bright: true },
  { x: 0.79, y: 0.62, bright: true },
  { x: 0.90, y: 0.34, bright: true },
  { x: 0.05, y: 0.36, bright: true },
];

export const SKY_EDGES: readonly SkyEdge[] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [5, 6],
  [6, 7],
  [8, 0],
];

export function litEdges(found: readonly number[]): SkyEdge[] {
  return SKY_EDGES.filter(([from, to]) => found.includes(from) && found.includes(to));
}
