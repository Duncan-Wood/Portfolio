import { type MemoryGrid } from './memory-art';

export interface Part {
  column: number;
  row: number;
  width: number;
  height: number;
  mark: string;
}

export interface Design {
  width: number;
  height: number;
  parts: readonly Part[];
}

export interface Shape extends Part {
  side: 'file' | 'page';
}

export const DOOR_COLUMNS = 110;
export const DOOR_ROWS = 64;
export const DOOR_LEFT = 52;
export const DOOR_RIGHT = 58;
export const FLOOR_ROW = 54;
const DOORWAY_TOP = 26;

const BACKGROUND_MARK = '7';
const FLOOR_MARK = '5';
const WALL_MARK = '6';
const FRAME_MARK = '2';
const DOORWAY_MARK = '.';

const FILE_EVERY = 600;
const FILE_TRAVEL = 1600;
const DOOR_TIME = 200;
const PAGE_TRAVEL = 1400;

export const FILE_KINDS: readonly Design[] = [
  {
    width: 16,
    height: 12,
    parts: [
      { column: 0, row: 0, width: 16, height: 12, mark: '1' },
      { column: 2, row: 2, width: 12, height: 7, mark: '5' },
      { column: 10, row: 3, width: 2, height: 2, mark: '2' },
    ],
  },
  {
    width: 12,
    height: 16,
    parts: [
      { column: 0, row: 0, width: 12, height: 16, mark: '2' },
      { column: 0, row: 3, width: 12, height: 1, mark: '6' },
      { column: 0, row: 7, width: 12, height: 1, mark: '6' },
      { column: 0, row: 11, width: 12, height: 1, mark: '6' },
      { column: 4, row: 0, width: 1, height: 16, mark: '6' },
    ],
  },
  {
    width: 14,
    height: 14,
    parts: [
      { column: 0, row: 0, width: 14, height: 14, mark: '0' },
      { column: 2, row: 3, width: 10, height: 1, mark: '4' },
      { column: 2, row: 6, width: 10, height: 1, mark: '4' },
      { column: 2, row: 9, width: 7, height: 1, mark: '4' },
    ],
  },
  {
    width: 10,
    height: 20,
    parts: [
      { column: 0, row: 0, width: 10, height: 20, mark: '0' },
      { column: 2, row: 2, width: 6, height: 9, mark: '4' },
      { column: 2, row: 13, width: 6, height: 1, mark: '4' },
      { column: 2, row: 16, width: 4, height: 1, mark: '4' },
    ],
  },
  {
    width: 8,
    height: 8,
    parts: [
      { column: 0, row: 0, width: 8, height: 8, mark: '2' },
      { column: 1, row: 3, width: 6, height: 1, mark: '6' },
    ],
  },
];

export const PAGE: Design = {
  width: 12,
  height: 15,
  parts: [
    { column: 0, row: 0, width: 12, height: 15, mark: '3' },
    { column: 9, row: 0, width: 3, height: 3, mark: '7' },
    { column: 2, row: 4, width: 8, height: 1, mark: '7' },
    { column: 2, row: 7, width: 8, height: 1, mark: '7' },
    { column: 2, row: 10, width: 6, height: 1, mark: '7' },
  ],
};

export const STREAM_LOOP = FILE_EVERY * FILE_KINDS.length;

export const STILL_MOMENT = 1000;

function place(design: Design, column: number, side: Shape['side'], from: number, to: number): Shape[] {
  const row = FLOOR_ROW - design.height;

  return design.parts.flatMap((part) => {
    const left = Math.max(column + part.column, from);
    const right = Math.min(column + part.column + part.width, to);
    return right > left
      ? [{ ...part, column: left, row: row + part.row, width: right - left, side }]
      : [];
  });
}

export function doorwayScene(elapsed: number): Shape[] {
  const shapes: Shape[] = [];
  const kindOf = (n: number): Design => FILE_KINDS[((n % FILE_KINDS.length) + FILE_KINDS.length) % FILE_KINDS.length];

  const firstFile = Math.ceil((elapsed - FILE_TRAVEL) / FILE_EVERY);
  for (let n = firstFile; n * FILE_EVERY <= elapsed; n += 1) {
    const design = kindOf(n);
    const progress = (elapsed - n * FILE_EVERY) / FILE_TRAVEL;
    const column = Math.round(-design.width + (DOOR_LEFT + design.width) * progress);
    shapes.push(...place(design, column, 'file', 0, DOOR_LEFT));
  }

  const pageDelay = FILE_TRAVEL + DOOR_TIME;
  const firstPage = Math.ceil((elapsed - pageDelay - PAGE_TRAVEL) / FILE_EVERY);
  for (let n = firstPage; n * FILE_EVERY + pageDelay <= elapsed; n += 1) {
    const progress = (elapsed - n * FILE_EVERY - pageDelay) / PAGE_TRAVEL;
    const start = DOOR_RIGHT - PAGE.width;
    const column = Math.round(start + (DOOR_COLUMNS - start) * progress);
    shapes.push(...place(PAGE, column, 'page', DOOR_RIGHT, DOOR_COLUMNS));
  }

  return shapes;
}

function doorwayGrid(): string[][] {
  return Array.from({ length: DOOR_ROWS }, (_, row) => Array.from({ length: DOOR_COLUMNS }, (_, column) => {
    const inWall = column >= DOOR_LEFT && column < DOOR_RIGHT;
    if (inWall) {
      const inOpening = row >= DOORWAY_TOP && row < FLOOR_ROW;
      if (!inOpening) {
        return row === DOORWAY_TOP - 1 ? FRAME_MARK : WALL_MARK;
      }
      return column === DOOR_LEFT || column === DOOR_RIGHT - 1 ? FRAME_MARK : DOORWAY_MARK;
    }
    return row >= FLOOR_ROW ? FLOOR_MARK : BACKGROUND_MARK;
  }));
}

function sampled(grid: string[][], columns: number, rows: number): MemoryGrid {
  return {
    columns,
    rows: Array.from({ length: rows }, (_, row) => Array.from({ length: columns }, (_, column) => (
      grid[Math.floor((row * DOOR_ROWS) / rows)][Math.floor((column * DOOR_COLUMNS) / columns)]
    )).join('')),
  };
}

export function drawDoorway(columns: number, rows: number): MemoryGrid {
  return sampled(doorwayGrid(), columns, rows);
}

export function drawDoor(columns: number, rows: number, elapsed: number): MemoryGrid {
  const grid = doorwayGrid();
  for (const shape of doorwayScene(elapsed)) {
    for (let row = shape.row; row < shape.row + shape.height; row += 1) {
      for (let column = shape.column; column < shape.column + shape.width; column += 1) {
        grid[row][column] = shape.mark;
      }
    }
  }
  return sampled(grid, columns, rows);
}
