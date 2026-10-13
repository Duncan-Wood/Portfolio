import { describe, expect, it } from 'vitest';
import { BAR_LOOP, STILL_MOMENT, barsRising, findBars } from './cost-bars';
import { MEMORY_ART } from './memory-art';

const chart = MEMORY_ART['the-bills'];
const { base, bars } = findBars(chart);

const cellsOf = (shapes: ReturnType<typeof barsRising>) => (
  shapes.reduce((total, shape) => total + shape.width * shape.height, 0)
);

const barCells = bars.reduce(
  (total, bar) => total + bar.rows.join('').replaceAll('.', '').length,
  0,
);

describe('finding the bars in the cost chart', () => {
  it('finds one bar for each month of the chart', () => {
    expect(bars).toHaveLength(9);
  });

  it('keeps the bars in order, left to right, with a gap between each', () => {
    for (let index = 1; index < bars.length; index += 1) {
      expect(bars[index].column).toBeGreaterThan(bars[index - 1].column + bars[index - 1].width);
    }
  });

  it('leaves the chart the same size once the bars are lifted out', () => {
    expect(base.columns).toBe(chart.columns);
    expect(base.rows).toHaveLength(chart.rows.length);
  });

  it('empties every cell a bar used to cover and touches nothing else', () => {
    const covered = new Set<string>();
    for (const bar of bars) {
      for (let offset = 0; offset < bar.rows.length; offset += 1) {
        for (let at = 0; at < bar.width; at += 1) {
          covered.add(`${bar.column + at},${bar.top + offset}`);
        }
      }
    }

    chart.rows.forEach((row, rowIndex) => {
      [...row].forEach((mark, column) => {
        const now = base.rows[rowIndex][column];
        expect(now).toBe(covered.has(`${column},${rowIndex}`) ? '.' : mark);
      });
    });
  });

  it('keeps the baseline of the chart in the base, so the bars have something to stand on', () => {
    const lowest = Math.max(...bars.map((bar) => bar.top + bar.rows.length));

    expect(base.rows[lowest].replaceAll('.', '').length).toBeGreaterThan(chart.columns / 2);
  });
});

describe('the bars rising', () => {
  it('starts with nothing drawn, so the first bar has somewhere to rise from', () => {
    expect(barsRising(bars, 0)).toEqual([]);
  });

  it('opens on the whole chart, as it looks in the still picture', () => {
    expect(cellsOf(barsRising(bars, STILL_MOMENT))).toBe(barCells);
  });

  it('raises the bars one after another, left to right', () => {
    const midway = STILL_MOMENT / 2;
    const columns = barsRising(bars, midway).map((shape) => shape.column);

    expect(columns.length).toBeGreaterThan(0);
    expect(columns.every((column) => column < bars[bars.length - 1].column)).toBe(true);
  });

  it('draws each bar from the bottom up', () => {
    const [first] = bars;
    const bottomRow = first.top + first.rows.length - 1;
    const shapes = barsRising(bars, 200).filter((shape) => shape.column < first.column + first.width);

    expect(shapes.length).toBeGreaterThan(0);
    expect(Math.max(...shapes.map((shape) => shape.row))).toBe(bottomRow);
  });

  it('grows the picture steadily, never drawing less as the bars rise', () => {
    let previous = 0;

    for (let moment = 0; moment <= STILL_MOMENT; moment += 50) {
      const drawn = cellsOf(barsRising(bars, moment));
      expect(drawn).toBeGreaterThanOrEqual(previous);
      previous = drawn;
    }
  });

  it('lets the bars fall away together before it starts again', () => {
    const falling = cellsOf(barsRising(bars, BAR_LOOP - 100));

    expect(falling).toBeGreaterThan(0);
    expect(falling).toBeLessThan(barCells);
  });

  it('repeats exactly once the bars have fallen', () => {
    expect(barsRising(bars, 700)).toEqual(barsRising(bars, 700 + BAR_LOOP));
  });

  it('only ever draws marks the chart itself uses', () => {
    const used = new Set(chart.rows.join(''));

    for (const shape of barsRising(bars, STILL_MOMENT)) {
      expect(used.has(shape.mark)).toBe(true);
    }
  });

  it('keeps every shape inside the chart', () => {
    for (const shape of barsRising(bars, STILL_MOMENT)) {
      expect(shape.column).toBeGreaterThanOrEqual(0);
      expect(shape.column + shape.width).toBeLessThanOrEqual(chart.columns);
      expect(shape.row).toBeGreaterThanOrEqual(0);
      expect(shape.row + shape.height).toBeLessThanOrEqual(chart.rows.length);
    }
  });
});
