import { type MemoryGrid } from './memory-art';

export interface Shape {
  column: number;
  row: number;
  width: number;
  height: number;
  mark: string;
}

export type Decision = 'accept' | 'reject' | 'edit';

export const REVIEW_COLUMNS = 110;
export const REVIEW_ROWS = 64;

export const DECISIONS: readonly Decision[] = ['accept', 'reject', 'edit', 'accept', 'accept'];

const BACKGROUND_MARK = '7';
const HEADER_MARK = '3';
const LABEL_MARK = '6';
const GUESS_MARK = '2';
const OLD_MARK = '6';
const LINE_MARK = '4';
const ACCEPT_MARK = '1';
const REJECT_MARK = '0';
const EDIT_MARK = '2';
const CURSOR_MARK = '3';

const HEADER_ROWS = 6;
const LABEL_ROW = 9;
const FIRST_ROW = 14;
const ROW_PITCH = 9;
const ROW_HEIGHT = 8;
const OLD_LEFT = 6;
const GUESS_LEFT = 50;
const GLYPH_LEFT = 94;
const GLYPH_SIZE = 7;
const TABLE_LEFT = 3;
const TABLE_RIGHT = REVIEW_COLUMNS - 3;

const OLD_WIDTHS = [26, 18, 30, 22, 28];
const GUESS_WIDTHS = [30, 24, 14, 22, 32];
const CORRECTION_WIDTH = 28;

export const STEP = 700;
const HOLD = 2200;
const DECIDED_AFTER = 350;

export const STILL_MOMENT = DECISIONS.length * STEP;
export const REVIEW_LOOP = STILL_MOMENT + HOLD;

const rowTop = (index: number): number => FIRST_ROW + index * ROW_PITCH;

function fill(grid: string[][], shape: Shape): void {
  for (let row = shape.row; row < shape.row + shape.height; row += 1) {
    for (let column = shape.column; column < shape.column + shape.width; column += 1) {
      grid[row][column] = shape.mark;
    }
  }
}

function block(column: number, row: number, width: number, height: number, mark: string): Shape {
  return { column, row, width, height, mark };
}

function glyph(decision: Decision, row: number): Shape[] {
  const cells: Shape[] = [];
  const top = row + 1;
  const dot = (x: number, y: number, mark: string) => cells.push(block(GLYPH_LEFT + x, top + y, 1, 1, mark));

  if (decision === 'accept') {
    [[0, 3], [1, 4], [2, 5], [3, 4], [4, 3], [5, 2], [6, 1]].forEach(([x, y]) => dot(x, y, ACCEPT_MARK));
    [[0, 4], [1, 5], [2, 6], [3, 5], [4, 4], [5, 3], [6, 2]].forEach(([x, y]) => dot(x, y, ACCEPT_MARK));
  } else if (decision === 'reject') {
    for (let step = 0; step < GLYPH_SIZE; step += 1) {
      dot(step, step, REJECT_MARK);
      dot(GLYPH_SIZE - 1 - step, step, REJECT_MARK);
    }
  } else {
    for (let step = 0; step < GLYPH_SIZE - 1; step += 1) {
      dot(step, GLYPH_SIZE - 1 - step, EDIT_MARK);
      dot(step + 1, GLYPH_SIZE - 1 - step, EDIT_MARK);
    }
    dot(0, GLYPH_SIZE - 1, REJECT_MARK);
  }

  return cells;
}

function staticShapes(): Shape[] {
  const shapes: Shape[] = [
    block(0, 0, REVIEW_COLUMNS, HEADER_ROWS, HEADER_MARK),
    block(4, 2, 5, 2, GUESS_MARK),
    block(12, 2, 24, 2, ACCEPT_MARK),
    block(REVIEW_COLUMNS - 22, 1, 18, 4, BACKGROUND_MARK),
    block(OLD_LEFT, LABEL_ROW, 16, 2, LABEL_MARK),
    block(GUESS_LEFT, LABEL_ROW, 24, 2, LABEL_MARK),
    block(GLYPH_LEFT, LABEL_ROW, 10, 2, LABEL_MARK),
  ];

  DECISIONS.forEach((decision, index) => {
    const top = rowTop(index);
    shapes.push(block(TABLE_LEFT, top + ROW_HEIGHT, TABLE_RIGHT - TABLE_LEFT, 1, LINE_MARK));
    shapes.push(block(OLD_LEFT, top + 3, OLD_WIDTHS[index], 2, OLD_MARK));

    if (decision === 'edit') {
      shapes.push(block(GUESS_LEFT, top + 1, GUESS_WIDTHS[index], 2, LABEL_MARK));
    } else {
      shapes.push(block(GUESS_LEFT, top + 3, GUESS_WIDTHS[index], 2, GUESS_MARK));
    }
  });

  return shapes;
}

function baseGrid(): string[][] {
  const grid = Array.from({ length: REVIEW_ROWS }, () => new Array<string>(REVIEW_COLUMNS).fill(BACKGROUND_MARK));
  for (const shape of staticShapes()) {
    fill(grid, shape);
  }
  return grid;
}

function cursorAround(index: number): Shape[] {
  const top = rowTop(index) - 1;
  const left = TABLE_LEFT;
  const width = TABLE_RIGHT - TABLE_LEFT;

  return [
    block(left, top, width, 1, CURSOR_MARK),
    block(left, top + ROW_HEIGHT, width, 1, CURSOR_MARK),
    block(left, top, 1, ROW_HEIGHT + 1, CURSOR_MARK),
    block(left + width - 1, top, 1, ROW_HEIGHT + 1, CURSOR_MARK),
  ];
}

export function reviewScene(elapsed: number): Shape[] {
  const moment = elapsed % REVIEW_LOOP;
  const shapes: Shape[] = [];

  DECISIONS.forEach((decision, index) => {
    if (moment < index * STEP + DECIDED_AFTER) {
      return;
    }
    shapes.push(...glyph(decision, rowTop(index)));
    if (decision === 'edit') {
      shapes.push(block(GUESS_LEFT, rowTop(index) + 4, CORRECTION_WIDTH, 2, ACCEPT_MARK));
    }
  });

  if (moment < STILL_MOMENT) {
    shapes.push(...cursorAround(Math.floor(moment / STEP)));
  }

  return shapes;
}

function sampled(grid: string[][], columns: number, rows: number): MemoryGrid {
  return {
    columns,
    rows: Array.from({ length: rows }, (_, row) => Array.from({ length: columns }, (_, column) => (
      grid[Math.floor((row * REVIEW_ROWS) / rows)][Math.floor((column * REVIEW_COLUMNS) / columns)]
    )).join('')),
  };
}

export function drawReviewBase(columns: number, rows: number): MemoryGrid {
  return sampled(baseGrid(), columns, rows);
}

export function drawReview(columns: number, rows: number, elapsed: number): MemoryGrid {
  const grid = baseGrid();
  for (const shape of reviewScene(elapsed)) {
    fill(grid, shape);
  }
  return sampled(grid, columns, rows);
}
