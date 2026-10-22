import { FRAGMENT_COUNT, collectionEntries } from './memories';
import { MEMORY_PICTURES } from './memory-pictures';
import { VICTORY_TEXT_AND_BUTTONS, type Rect } from './victory-layout';

export const SKY_WIDTH = 620;
export const SKY_HEIGHT = 900;

export interface SkyPoint {
  x: number;
  y: number;
}

export interface TrunkSample extends SkyPoint {
  along: number;
}

export type SkyEdge = readonly [number, number];

export const SKY_CELLS: readonly SkyPoint[] = [
  { x: 455, y: 250 },
  { x: 548, y: 300 },
  { x: 498, y: 372 },
  { x: 556, y: 450 },
  { x: 516, y: 530 },
  { x: 560, y: 612 },
  { x: 508, y: 700 },
  { x: 178, y: 742 },
  { x: 86, y: 610 },
  { x: 112, y: 452 },
];

const PLACE_OF_MEMORY = [
  'THE DMV', 'THE DMV', 'THE DMV', 'THE DMV', 'THE DMV',
  'FLORIDA', 'FLORIDA',
  'ILLINOIS', 'ILLINOIS', 'ILLINOIS',
];

const SAMPLES_PER_SEGMENT = 28;
const BOTTOM_SWING = { x: 340, y: 806, along: 6.5 };
const PICTURE_WIDTH = 170;
const LABEL_HEIGHT = 14;
const LABEL_GAP = 26;
const LABEL_CLEARANCE = 6;
const LABEL_MARGIN = 8;
const LABEL_FLOOR = 830;

export const SKY_ROUTE: readonly SkyEdge[] = SKY_CELLS.slice(1).map((_, index) => [index, index + 1]);

export function starOf(index: number): SkyPoint {
  return SKY_CELLS[index];
}

export function placeOf(index: number): string {
  return PLACE_OF_MEMORY[index];
}

export function litRoute(found: readonly number[]): SkyEdge[] {
  return SKY_ROUTE.filter(([from, to]) => found.includes(from) && found.includes(to));
}

export function neighbourOf(found: readonly number[], index: number, direction: -1 | 1): number {
  const ahead = found.filter((other) => (other - index) * direction > 0);

  return ahead.length === 0 ? index : ahead.reduce((nearest, other) => (
    Math.abs(other - index) < Math.abs(nearest - index) ? other : nearest
  ));
}

export function routeCovers(found: readonly number[], along: number): boolean {
  return litRoute(found).some(([from, to]) => along >= from && along <= to);
}

export function trunkLitAt(found: readonly number[], sample: number): boolean {
  const along = SKY_TRUNK[sample]?.along;
  return along !== undefined && (routeCovers(found, along) || found.includes(along));
}

function buildTrunk(): TrunkSample[] {
  const waypoints: TrunkSample[] = SKY_CELLS.map((cell, along) => ({ ...cell, along }));
  waypoints.splice(7, 0, BOTTOM_SWING);

  const padded = [waypoints[0], ...waypoints, waypoints[waypoints.length - 1]];
  const samples: TrunkSample[] = [];

  for (let at = 1; at < padded.length - 2; at += 1) {
    const [before, from, to, after] = [padded[at - 1], padded[at], padded[at + 1], padded[at + 2]];

    for (let step = 0; step < SAMPLES_PER_SEGMENT; step += 1) {
      const fraction = step / SAMPLES_PER_SEGMENT;
      const blend = (axis: 'x' | 'y'): number => 0.5 * (
        2 * from[axis]
        + (-before[axis] + to[axis]) * fraction
        + (2 * before[axis] - 5 * from[axis] + 4 * to[axis] - after[axis]) * fraction * fraction
        + (-before[axis] + 3 * from[axis] - 3 * to[axis] + after[axis]) * fraction * fraction * fraction
      );

      samples.push({ x: blend('x'), y: blend('y'), along: from.along + (to.along - from.along) * fraction });
    }
  }

  samples.push({ ...waypoints[waypoints.length - 1] });

  return samples;
}

export const SKY_TRUNK: readonly TrunkSample[] = buildTrunk();

export const CELL_SAMPLE: readonly number[] = SKY_CELLS.map((_, index) => SKY_TRUNK.findIndex((sample) => sample.along === index));

export function trunkWidth(along: number): number {
  return 3.2 - (along / (FRAGMENT_COUNT - 1)) * 2.1;
}

export function nearestTrunkSample(point: SkyPoint, reach: number): number {
  let nearest = -1;
  let closest = reach;

  SKY_TRUNK.forEach((sample, index) => {
    const distance = Math.hypot(sample.x - point.x, sample.y - point.y);
    if (distance < closest) {
      closest = distance;
      nearest = index;
    }
  });

  return nearest;
}

const meets = (rect: Rect, other: Rect): boolean => rect.left < other.right + LABEL_CLEARANCE
  && rect.right > other.left - LABEL_CLEARANCE
  && rect.top < other.bottom + LABEL_CLEARANCE
  && rect.bottom > other.top - LABEL_CLEARANCE;

export function labelSpot(index: number, width: number): { left: number; top: number } {
  const { x, y } = SKY_CELLS[index];
  const options = [
    { left: x + LABEL_GAP, top: y - LABEL_HEIGHT / 2 },
    { left: x - LABEL_GAP - width, top: y - LABEL_HEIGHT / 2 },
    { left: x - width / 2, top: y - LABEL_GAP - LABEL_HEIGHT },
    { left: x - width / 2, top: y + LABEL_GAP },
  ];

  const fits = ({ left, top }: { left: number; top: number }): boolean => {
    const box = { left, top, right: left + width, bottom: top + LABEL_HEIGHT };

    return box.left > LABEL_MARGIN
      && box.right < SKY_WIDTH - LABEL_MARGIN
      && box.bottom < LABEL_FLOOR
      && VICTORY_TEXT_AND_BUTTONS.every((rect) => !meets(box, rect));
  };

  return options.find(fits) ?? options[0];
}

export function pictureFrameOf(index: number): Rect {
  const art = MEMORY_PICTURES[collectionEntries()[index].photo!];
  const height = (PICTURE_WIDTH * art.rows.length) / art.columns;
  const centerX = Math.min(SKY_CELLS[index].x, SKY_WIDTH - PICTURE_WIDTH / 2 - LABEL_MARGIN);
  const { y } = SKY_CELLS[index];

  return {
    left: centerX - PICTURE_WIDTH / 2,
    right: centerX + PICTURE_WIDTH / 2,
    top: y - height / 2,
    bottom: y + height / 2,
  };
}
