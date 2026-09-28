import { type MemoryGrid } from './memory-art';

export interface MapPoint {
  x: number;
  y: number;
}

export type MapThread = readonly [number, number];

export const CUSTOMER_COUNT = 70;

export const PIN_MARK = '2';
export const THREAD_MARK = '0';
const LAND_MARK = '6';
const COAST_MARK = '4';
const SEA_MARK = '7';
const GRATICULE_MARK = '5';

const PIN_SEED = 2019;
const PIN_SPACING = 0.045;
const GRATICULE_EVERY = 11;
const LARGE_PINS_FROM = 60;

const COASTLINE: readonly MapPoint[] = [
  { x: 0.12, y: 0.30 },
  { x: 0.22, y: 0.16 },
  { x: 0.38, y: 0.12 },
  { x: 0.50, y: 0.20 },
  { x: 0.62, y: 0.10 },
  { x: 0.80, y: 0.14 },
  { x: 0.90, y: 0.28 },
  { x: 0.86, y: 0.46 },
  { x: 0.92, y: 0.62 },
  { x: 0.80, y: 0.80 },
  { x: 0.64, y: 0.86 },
  { x: 0.54, y: 0.74 },
  { x: 0.44, y: 0.88 },
  { x: 0.28, y: 0.84 },
  { x: 0.16, y: 0.70 },
  { x: 0.08, y: 0.52 },
];

export function isLand({ x, y }: MapPoint): boolean {
  let inside = false;

  for (let index = 0, previous = COASTLINE.length - 1; index < COASTLINE.length; previous = index, index += 1) {
    const a = COASTLINE[index];
    const b = COASTLINE[previous];
    const crosses = (a.y > y) !== (b.y > y)
      && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x;
    if (crosses) {
      inside = !inside;
    }
  }

  return inside;
}

function placePins(): MapPoint[] {
  let seed = PIN_SEED;
  const next = (): number => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };

  const pins: MapPoint[] = [];
  while (pins.length < CUSTOMER_COUNT) {
    const candidate = { x: next(), y: next() };
    const crowded = pins.some((pin) => distance(pin, candidate) < PIN_SPACING);
    if (isLand(candidate) && !crowded) {
      pins.push(candidate);
    }
  }

  return pins;
}

function distance(a: MapPoint, b: MapPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function threadToNearest(pins: readonly MapPoint[]): MapThread[] {
  return pins.slice(1).map((pin, offset) => {
    const index = offset + 1;
    let nearest = 0;
    for (let earlier = 1; earlier < index; earlier += 1) {
      if (distance(pins[earlier], pin) < distance(pins[nearest], pin)) {
        nearest = earlier;
      }
    }
    return [nearest, index] as const;
  });
}

export const MAP_PINS: readonly MapPoint[] = placePins();

export const MAP_THREADS: readonly MapThread[] = threadToNearest(MAP_PINS);

export function pinCell(point: MapPoint, columns: number, rows: number): { column: number; row: number } {
  return {
    column: Math.round(point.x * (columns - 1)),
    row: Math.round(point.y * (rows - 1)),
  };
}

export function drawMap(columns: number, rows: number): MemoryGrid {
  const landAt = (column: number, row: number): boolean => isLand({
    x: (column + 0.5) / columns,
    y: (row + 0.5) / rows,
  });

  const grid: string[][] = Array.from({ length: rows }, (_, row) => Array.from({ length: columns }, (_, column) => {
    if (!landAt(column, row)) {
      const onGraticule = column % GRATICULE_EVERY === 0 || row % GRATICULE_EVERY === 0;
      return onGraticule && (column + row) % 2 === 0 ? GRATICULE_MARK : SEA_MARK;
    }
    const coast = !landAt(column - 1, row) || !landAt(column + 1, row)
      || !landAt(column, row - 1) || !landAt(column, row + 1);
    return coast ? COAST_MARK : LAND_MARK;
  }));

  for (const [from, to] of MAP_THREADS) {
    const start = pinCell(MAP_PINS[from], columns, rows);
    const end = pinCell(MAP_PINS[to], columns, rows);
    const steps = Math.max(Math.abs(end.column - start.column), Math.abs(end.row - start.row));
    for (let step = 0; step <= steps; step += 1) {
      const along = steps === 0 ? 0 : step / steps;
      const column = Math.round(start.column + (end.column - start.column) * along);
      const row = Math.round(start.row + (end.row - start.row) * along);
      grid[row][column] = THREAD_MARK;
    }
  }

  const pinSize = columns >= LARGE_PINS_FROM ? 2 : 1;
  for (const pin of MAP_PINS) {
    const { column, row } = pinCell(pin, columns, rows);
    for (let down = 0; down < pinSize; down += 1) {
      for (let across = 0; across < pinSize; across += 1) {
        grid[row + down][column + across] = PIN_MARK;
      }
    }
  }

  return { columns, rows: grid.map((row) => row.join('')) };
}
