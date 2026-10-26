import { describe, expect, it } from 'vitest';
import {
  DECISIONS,
  REVIEW_COLUMNS,
  REVIEW_LOOP,
  REVIEW_ROWS,
  STEP,
  STILL_MOMENT,
  drawReview,
  drawReviewBase,
  reviewScene,
} from './review-screen';

const GLYPH_MARKS = ['1', '0', '2'];
const CURSOR_MARK = '3';

const glyphsAt = (elapsed: number) => (
  reviewScene(elapsed).filter((shape) => shape.row >= 14 && GLYPH_MARKS.includes(shape.mark) && shape.column >= 92)
);

describe('drawing the review screen', () => {
  it('fills exactly the size asked for', () => {
    for (const [columns, rows] of [[REVIEW_COLUMNS, REVIEW_ROWS], [22, 13]]) {
      const screen = drawReview(columns, rows, STILL_MOMENT);

      expect(screen.columns).toBe(columns);
      expect(screen.rows).toHaveLength(rows);
      for (const row of screen.rows) {
        expect(row).toHaveLength(columns);
      }
    }
  });

  it('uses only marks the art baker knows how to colour', () => {
    for (const row of drawReview(REVIEW_COLUMNS, REVIEW_ROWS, STILL_MOMENT).rows) {
      expect(row).toMatch(/^[.0-7]+$/);
    }
  });

  it('draws the screen before anything is decided, and differently once everything is', () => {
    const base = drawReviewBase(REVIEW_COLUMNS, REVIEW_ROWS);

    expect(drawReviewBase(REVIEW_COLUMNS, REVIEW_ROWS)).toEqual(base);
    expect(drawReview(REVIEW_COLUMNS, REVIEW_ROWS, STILL_MOMENT)).not.toEqual(base);
  });
});

describe('the reviewer working down the rows', () => {
  it('decides every row, and not all of them the same way', () => {
    expect(DECISIONS.length).toBeGreaterThan(2);
    expect(new Set(DECISIONS).size).toBeGreaterThan(1);
    expect(DECISIONS).toContain('edit');
  });

  it('has decided nothing at the start', () => {
    expect(glyphsAt(0)).toEqual([]);
  });

  it('decides the rows one after another, top to bottom', () => {
    const lowestDecided = (elapsed: number) => (
      Math.max(-1, ...glyphsAt(elapsed).map((shape) => shape.row))
    );

    let previous = -1;
    for (let moment = 0; moment <= STILL_MOMENT; moment += 50) {
      const lowest = lowestDecided(moment);
      expect(lowest).toBeGreaterThanOrEqual(previous);
      previous = lowest;
    }
    expect(lowestDecided(STILL_MOMENT)).toBeGreaterThan(lowestDecided(STEP));
  });

  it('keeps a cursor on the row being looked at while it works', () => {
    expect(reviewScene(STEP / 2).some((shape) => shape.mark === CURSOR_MARK)).toBe(true);
  });

  it('puts the cursor away once every row is decided', () => {
    expect(reviewScene(STILL_MOMENT).some((shape) => shape.mark === CURSOR_MARK)).toBe(false);
  });

  it('keeps the machine’s guess beside the correction on the edited row', () => {
    const grid = drawReview(REVIEW_COLUMNS, REVIEW_ROWS, STILL_MOMENT).rows;
    const base = drawReviewBase(REVIEW_COLUMNS, REVIEW_ROWS).rows;
    const top = 14 + DECISIONS.indexOf('edit') * 9;
    const cell = (rows: readonly string[]) => rows.slice(top, top + 8).map((row) => row.slice(50, 90)).join('');

    expect(cell(base)).toContain('6');
    expect(cell(grid)).toContain('6');
    expect(cell(grid)).toContain('1');
    expect(cell(base)).not.toContain('1');
  });

  it('keeps every shape inside the screen', () => {
    for (let moment = 0; moment < REVIEW_LOOP; moment += 100) {
      for (const shape of reviewScene(moment)) {
        expect(shape.column).toBeGreaterThanOrEqual(0);
        expect(shape.column + shape.width).toBeLessThanOrEqual(REVIEW_COLUMNS);
        expect(shape.row).toBeGreaterThanOrEqual(0);
        expect(shape.row + shape.height).toBeLessThanOrEqual(REVIEW_ROWS);
      }
    }
  });

  it('starts over once it has held on the finished screen', () => {
    expect(reviewScene(700)).toEqual(reviewScene(700 + REVIEW_LOOP));
    expect(REVIEW_LOOP).toBeGreaterThan(STILL_MOMENT);
  });
});
