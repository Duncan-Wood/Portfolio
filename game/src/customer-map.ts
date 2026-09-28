import { type MemoryGrid } from './memory-art';

export interface MapPoint {
  x: number;
  y: number;
}

export type MapThread = readonly [number, number];

export const CUSTOMER_COUNT = 70;

export const MAP_COLUMNS = 110;
export const MAP_ROWS = 82;

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
const PIN_STAGGER = 34;
const THREAD_RUN = 150;

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

type Cell = { column: number; row: number };

export function threadCells([from, to]: MapThread, columns: number, rows: number): Cell[] {
  const start = pinCell(MAP_PINS[from], columns, rows);
  const end = pinCell(MAP_PINS[to], columns, rows);
  const steps = Math.max(Math.abs(end.column - start.column), Math.abs(end.row - start.row));

  return Array.from({ length: steps + 1 }, (_, step) => {
    const along = steps === 0 ? 0 : step / steps;
    return {
      column: Math.round(start.column + (end.column - start.column) * along),
      row: Math.round(start.row + (end.row - start.row) * along),
    };
  });
}

export function pinCells(pin: MapPoint, columns: number, rows: number): Cell[] {
  const { column, row } = pinCell(pin, columns, rows);
  const size = columns >= LARGE_PINS_FROM ? 2 : 1;
  const cells: Cell[] = [];
  for (let down = 0; down < size; down += 1) {
    for (let across = 0; across < size; across += 1) {
      cells.push({ column: column + across, row: row + down });
    }
  }
  return cells;
}

export function drawLand(columns: number, rows: number): MemoryGrid {
  return { columns, rows: landGrid(columns, rows).map((row) => row.join('')) };
}

export function drawMap(columns: number, rows: number): MemoryGrid {
  const grid = landGrid(columns, rows);

  for (const thread of MAP_THREADS) {
    for (const { column, row } of threadCells(thread, columns, rows)) {
      grid[row][column] = THREAD_MARK;
    }
  }

  for (const pin of MAP_PINS) {
    for (const { column, row } of pinCells(pin, columns, rows)) {
      grid[row][column] = PIN_MARK;
    }
  }

  return { columns, rows: grid.map((row) => row.join('')) };
}

function landGrid(columns: number, rows: number): string[][] {
  const landAt = (column: number, row: number): boolean => isLand({
    x: (column + 0.5) / columns,
    y: (row + 0.5) / rows,
  });

  return Array.from({ length: rows }, (_, row) => Array.from({ length: columns }, (_, column) => {
    if (!landAt(column, row)) {
      const onGraticule = column % GRATICULE_EVERY === 0 || row % GRATICULE_EVERY === 0;
      return onGraticule && (column + row) % 2 === 0 ? GRATICULE_MARK : SEA_MARK;
    }
    const coast = !landAt(column - 1, row) || !landAt(column + 1, row)
      || !landAt(column, row - 1) || !landAt(column, row + 1);
    return coast ? COAST_MARK : LAND_MARK;
  }));
}

const LANDS_AT: number[] = new Array(MAP_PINS.length).fill(0);
const THREAD_STARTS: number[] = MAP_THREADS.map(([from, to]) => {
  const starts = Math.max(to * PIN_STAGGER, LANDS_AT[from]);
  LANDS_AT[to] = starts + THREAD_RUN;
  return starts;
});

export const BUILD_DURATION = Math.max(...LANDS_AT);

export function pinLandsAt(index: number): number {
  return LANDS_AT[index];
}

export function pinLanded(index: number, elapsed: number): boolean {
  return elapsed >= LANDS_AT[index];
}

export function threadStartsAt(index: number): number {
  return THREAD_STARTS[index];
}

export function threadRun(index: number, elapsed: number): number {
  const progress = Math.min(Math.max((elapsed - THREAD_STARTS[index]) / THREAD_RUN, 0), 1);
  return 1 - (1 - progress) * (1 - progress);
}
