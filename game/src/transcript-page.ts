import { type MemoryGrid } from './memory-art';

type Speaker = 'tutor' | 'student';

export interface Shape {
  column: number;
  row: number;
  width: number;
  height: number;
  mark: string;
}

interface Highlight {
  offset: number;
  width: number;
  mark: string;
}

export interface TranscriptLine {
  speaker: Speaker;
  column: number;
  row: number;
  width: number;
  highlights: Highlight[];
}

export const TRANSCRIPT_COLUMNS = 110;
export const TRANSCRIPT_ROWS = 64;

const PLACEHOLDER_MARK = '2';
const HEDGE_MARK = '1';
const FORCED_AGREEMENT_MARK = '3';
const OVERLAP_MARK = '0';

export const CODED_MARKS = [PLACEHOLDER_MARK, HEDGE_MARK, FORCED_AGREEMENT_MARK, OVERLAP_MARK];

const BACKGROUND_MARK = '7';
export const TEXT_MARK = '6';
export const CURSOR_MARK = '5';
const NUMBER_MARK = '4';

const FIRST_ROW = 6;
const ROW_PITCH = 6;
const LINE_HEIGHT = 3;
const NUMBER_COLUMN = 4;
const NUMBER_WIDTH = 5;
const TUTOR_COLUMN = 14;
const STUDENT_COLUMN = 48;

const SCRIPT: readonly (readonly [Speaker, number, readonly (readonly [number, number, string])[]])[] = [
  ['tutor', 84, [[0, 6, PLACEHOLDER_MARK], [30, 5, PLACEHOLDER_MARK], [60, 8, PLACEHOLDER_MARK]]],
  ['student', 26, []],
  ['tutor', 70, [[4, 8, PLACEHOLDER_MARK], [36, 10, HEDGE_MARK], [58, 6, PLACEHOLDER_MARK]]],
  ['student', 36, [[0, 5, PLACEHOLDER_MARK]]],
  ['tutor', 88, [[10, 5, PLACEHOLDER_MARK], [34, 12, HEDGE_MARK], [66, 16, FORCED_AGREEMENT_MARK]]],
  ['student', 22, []],
  ['tutor', 76, [[0, 7, PLACEHOLDER_MARK], [26, 6, PLACEHOLDER_MARK], [50, 14, FORCED_AGREEMENT_MARK]]],
  ['student', 30, [[2, 10, OVERLAP_MARK]]],
  ['tutor', 72, [[6, 18, OVERLAP_MARK], [40, 6, PLACEHOLDER_MARK]]],
];

export const STEP = 900;
const TYPE_TIME = 560;
const FIRST_CODE_AFTER = 620;
const CODE_GAP = 90;
const HOLD = 2400;

export const STILL_MOMENT = SCRIPT.length * STEP;
export const TRANSCRIPT_LOOP = STILL_MOMENT + HOLD;

export function transcriptLines(): TranscriptLine[] {
  return SCRIPT.map(([speaker, width, highlights], index) => ({
    speaker,
    column: speaker === 'tutor' ? TUTOR_COLUMN : STUDENT_COLUMN,
    row: FIRST_ROW + index * ROW_PITCH,
    width,
    highlights: highlights.map(([offset, highlightWidth, mark]) => ({ offset, width: highlightWidth, mark })),
  }));
}

function fill(grid: string[][], shape: Shape): void {
  for (let y = shape.row; y < shape.row + shape.height; y += 1) {
    for (let x = shape.column; x < shape.column + shape.width; x += 1) {
      grid[y][x] = shape.mark;
    }
  }
}

function baseGrid(): string[][] {
  const grid = Array.from({ length: TRANSCRIPT_ROWS }, () => new Array<string>(TRANSCRIPT_COLUMNS).fill(BACKGROUND_MARK));

  for (const line of transcriptLines()) {
    fill(grid, { column: NUMBER_COLUMN, row: line.row, width: NUMBER_WIDTH, height: LINE_HEIGHT, mark: NUMBER_MARK });
  }

  return grid;
}

export function transcriptScene(elapsed: number): Shape[] {
  const moment = Math.min(elapsed % TRANSCRIPT_LOOP, STILL_MOMENT);
  const shapes: Shape[] = [];

  transcriptLines().forEach((line, index) => {
    const sinceStart = moment - index * STEP;
    if (sinceStart <= 0) {
      return;
    }

    const typed = Math.min(line.width, Math.floor((sinceStart / TYPE_TIME) * line.width));
    shapes.push({ column: line.column, row: line.row, width: typed, height: LINE_HEIGHT, mark: TEXT_MARK });

    line.highlights.forEach((highlight, order) => {
      if (sinceStart >= FIRST_CODE_AFTER + order * CODE_GAP) {
        shapes.push({ column: line.column + highlight.offset, row: line.row, width: highlight.width, height: LINE_HEIGHT, mark: highlight.mark });
      }
    });

    if (moment < STILL_MOMENT && sinceStart < STEP) {
      shapes.push({ column: line.column + typed, row: line.row, width: 1, height: LINE_HEIGHT, mark: CURSOR_MARK });
    }
  });

  return shapes;
}

function sampled(grid: string[][], columns: number, rows: number): MemoryGrid {
  return {
    columns,
    rows: Array.from({ length: rows }, (_, row) => Array.from({ length: columns }, (_, column) => (
      grid[Math.floor((row * TRANSCRIPT_ROWS) / rows)][Math.floor((column * TRANSCRIPT_COLUMNS) / columns)]
    )).join('')),
  };
}

export function drawTranscriptBase(columns: number, rows: number): MemoryGrid {
  return sampled(baseGrid(), columns, rows);
}

export function drawTranscript(columns: number, rows: number, elapsed: number): MemoryGrid {
  const grid = baseGrid();
  for (const shape of transcriptScene(elapsed)) {
    fill(grid, shape);
  }
  return sampled(grid, columns, rows);
}
