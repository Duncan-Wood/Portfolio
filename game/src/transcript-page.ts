import { type MemoryGrid } from './memory-art';

type Speaker = 'tutor' | 'student';

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
const TEXT_MARK = '6';
const NUMBER_MARK = '4';

const FIRST_ROW = 4;
const ROW_PITCH = 3;
const LINE_HEIGHT = 2;
const NUMBER_COLUMN = 4;
const NUMBER_WIDTH = 5;
const TUTOR_COLUMN = 14;
const STUDENT_COLUMN = 48;

const SCRIPT: readonly (readonly [Speaker, number, readonly (readonly [number, number, string])[]])[] = [
  ['tutor', 84, [[0, 6, PLACEHOLDER_MARK], [30, 5, PLACEHOLDER_MARK], [60, 8, PLACEHOLDER_MARK]]],
  ['student', 26, []],
  ['tutor', 70, [[4, 8, PLACEHOLDER_MARK], [36, 10, HEDGE_MARK], [58, 6, PLACEHOLDER_MARK]]],
  ['student', 36, [[0, 5, PLACEHOLDER_MARK]]],
  ['tutor', 88, [[10, 5, PLACEHOLDER_MARK], [34, 12, HEDGE_MARK], [66, 8, PLACEHOLDER_MARK]]],
  ['student', 22, []],
  ['tutor', 76, [[0, 7, PLACEHOLDER_MARK], [26, 6, PLACEHOLDER_MARK], [50, 14, FORCED_AGREEMENT_MARK]]],
  ['student', 30, []],
  ['tutor', 82, [[8, 5, PLACEHOLDER_MARK], [40, 12, HEDGE_MARK], [64, 16, FORCED_AGREEMENT_MARK]]],
  ['student', 18, [[0, 6, PLACEHOLDER_MARK]]],
  ['tutor', 64, [[0, 6, PLACEHOLDER_MARK], [24, 10, FORCED_AGREEMENT_MARK], [46, 8, PLACEHOLDER_MARK]]],
  ['student', 34, []],
  ['tutor', 90, [[12, 6, PLACEHOLDER_MARK], [44, 10, HEDGE_MARK], [70, 14, FORCED_AGREEMENT_MARK]]],
  ['student', 28, [[2, 10, OVERLAP_MARK]]],
  ['tutor', 60, [[0, 8, OVERLAP_MARK], [22, 6, PLACEHOLDER_MARK]]],
  ['student', 32, [[0, 14, OVERLAP_MARK]]],
  ['tutor', 72, [[6, 18, OVERLAP_MARK], [40, 6, PLACEHOLDER_MARK]]],
  ['student', 24, []],
];

export function transcriptLines(): TranscriptLine[] {
  return SCRIPT.map(([speaker, width, highlights], index) => ({
    speaker,
    column: speaker === 'tutor' ? TUTOR_COLUMN : STUDENT_COLUMN,
    row: FIRST_ROW + index * ROW_PITCH,
    width,
    highlights: highlights.map(([offset, highlightWidth, mark]) => ({ offset, width: highlightWidth, mark })),
  }));
}

function fill(grid: string[][], column: number, row: number, width: number, height: number, mark: string): void {
  for (let y = row; y < row + height; y += 1) {
    for (let x = column; x < column + width; x += 1) {
      grid[y][x] = mark;
    }
  }
}

function baseGrid(): string[][] {
  const grid = Array.from({ length: TRANSCRIPT_ROWS }, () => new Array<string>(TRANSCRIPT_COLUMNS).fill(BACKGROUND_MARK));

  for (const line of transcriptLines()) {
    fill(grid, NUMBER_COLUMN, line.row, NUMBER_WIDTH, LINE_HEIGHT, NUMBER_MARK);
    fill(grid, line.column, line.row, line.width, LINE_HEIGHT, TEXT_MARK);
    for (const highlight of line.highlights) {
      fill(grid, line.column + highlight.offset, line.row, highlight.width, LINE_HEIGHT, highlight.mark);
    }
  }

  return grid;
}

export function drawTranscript(columns: number, rows: number): MemoryGrid {
  const grid = baseGrid();

  return {
    columns,
    rows: Array.from({ length: rows }, (_, row) => Array.from({ length: columns }, (_, column) => (
      grid[Math.floor((row * TRANSCRIPT_ROWS) / rows)][Math.floor((column * TRANSCRIPT_COLUMNS) / columns)]
    )).join('')),
  };
}
