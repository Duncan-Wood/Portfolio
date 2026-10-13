import { type MemoryGrid } from './memory-art';

export interface Bar {
  column: number;
  width: number;
  top: number;
  rows: readonly string[];
}

export interface Shape {
  column: number;
  row: number;
  width: number;
  height: number;
  mark: string;
}

const EMPTY = '.';
const FEWEST_CELLS_IN_A_BAR_COLUMN = 5;

const STAGGER = 220;
const RISE = 500;
const HOLD = 2200;
const DROP = 400;

export const STILL_MOMENT = 8 * STAGGER + RISE;
export const BAR_LOOP = STILL_MOMENT + HOLD + DROP;

function baselineRow(grid: MemoryGrid): number {
  let best = 0;
  let most = -1;

  grid.rows.forEach((row, index) => {
    const filled = row.replaceAll(EMPTY, '').length;
    if (filled >= most) {
      most = filled;
      best = index;
    }
  });

  return best;
}

export function findBars(grid: MemoryGrid): { base: MemoryGrid; bars: Bar[] } {
  const baseline = baselineRow(grid);
  const standing: boolean[] = [];

  for (let column = 0; column < grid.columns; column += 1) {
    let filled = 0;
    for (let row = 0; row < baseline; row += 1) {
      if (grid.rows[row][column] !== EMPTY) {
        filled += 1;
      }
    }
    standing.push(filled >= FEWEST_CELLS_IN_A_BAR_COLUMN);
  }

  const bars: Bar[] = [];
  let column = 0;
  while (column < grid.columns) {
    if (!standing[column]) {
      column += 1;
      continue;
    }

    let end = column;
    while (end < grid.columns && standing[end]) {
      end += 1;
    }

    const width = end - column;
    const slices = grid.rows.slice(0, baseline).map((row) => row.slice(column, end));
    const top = slices.findIndex((slice) => slice.replaceAll(EMPTY, '') !== '');
    bars.push({ column, width, top, rows: slices.slice(top) });
    column = end;
  }

  const base = grid.rows.map((row, index) => {
    if (index >= baseline) {
      return row;
    }
    return [...row].map((mark, at) => (standing[at] ? EMPTY : mark)).join('');
  });

  return { base: { columns: grid.columns, rows: base }, bars };
}

function progressOf(index: number, elapsed: number): number {
  const moment = elapsed % BAR_LOOP;

  if (moment < STILL_MOMENT) {
    return Math.min(Math.max((moment - index * STAGGER) / RISE, 0), 1);
  }
  if (moment < STILL_MOMENT + HOLD) {
    return 1;
  }
  return 1 - (moment - STILL_MOMENT - HOLD) / DROP;
}

export function barsRising(bars: readonly Bar[], elapsed: number): Shape[] {
  const shapes: Shape[] = [];

  bars.forEach((bar, index) => {
    const shown = Math.round(progressOf(index, elapsed) * bar.rows.length);

    for (let up = 0; up < shown; up += 1) {
      const rowInBar = bar.rows.length - 1 - up;
      const slice = bar.rows[rowInBar];
      let at = 0;

      while (at < slice.length) {
        const mark = slice[at];
        let end = at;
        while (end < slice.length && slice[end] === mark) {
          end += 1;
        }
        if (mark !== EMPTY) {
          shapes.push({
            column: bar.column + at,
            row: bar.top + rowInBar,
            width: end - at,
            height: 1,
            mark,
          });
        }
        at = end;
      }
    }
  });

  return shapes;
}
