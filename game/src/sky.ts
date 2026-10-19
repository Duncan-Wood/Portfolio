import { SKY_MEMORIES, SKY_REGIONS, type SkyRegion } from './sky-layout';

export interface SkyPoint {
  x: number;
  y: number;
}

export type SkyEdge = readonly [number, number];

export const SKY_ROUTE: readonly SkyEdge[] = SKY_MEMORIES.slice(1).map((_, index) => [index, index + 1]);

export function starOf(index: number): SkyPoint {
  const memory = SKY_MEMORIES[index];
  return memory.neurons[memory.main];
}

export function regionOf(index: number): SkyRegion {
  return SKY_REGIONS[SKY_MEMORIES[index].region];
}

function insideRing(point: SkyPoint, ring: readonly (readonly [number, number])[]): boolean {
  let inside = false;

  for (let at = 0, before = ring.length - 1; at < ring.length; before = at, at += 1) {
    const [x, y] = ring[at];
    const [beforeX, beforeY] = ring[before];
    const crosses = (y > point.y) !== (beforeY > point.y)
      && point.x < ((beforeX - x) * (point.y - y)) / (beforeY - y) + x;
    if (crosses) {
      inside = !inside;
    }
  }

  return inside;
}

export function insideRegion(point: SkyPoint, region: SkyRegion): boolean {
  return region.rings.some((ring) => insideRing(point, ring.points));
}

export function litRoute(found: readonly number[]): SkyEdge[] {
  return SKY_ROUTE.filter(([from, to]) => found.includes(from) && found.includes(to));
}
