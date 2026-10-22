import { describe, expect, it } from 'vitest';
import {
  CODED_MARKS,
  CURSOR_MARK,
  STEP,
  STILL_MOMENT,
  TEXT_MARK,
  TRANSCRIPT_COLUMNS,
  TRANSCRIPT_ROWS,
  TRANSCRIPT_LOOP,
  drawTranscript,
  drawTranscriptBase,
  transcriptLines,
  transcriptScene,
} from './transcript-page';

const countMarks = (rows: readonly string[], marks: readonly string[]) => (
  rows.join('').split('').filter((mark) => marks.includes(mark)).length
);

describe('drawing the coded transcript', () => {
  it('fills exactly the size asked for', () => {
    for (const [columns, rows] of [[TRANSCRIPT_COLUMNS, TRANSCRIPT_ROWS], [22, 13]]) {
      const page = drawTranscript(columns, rows, STILL_MOMENT);

      expect(page.columns).toBe(columns);
      expect(page.rows).toHaveLength(rows);
      for (const row of page.rows) {
        expect(row).toHaveLength(columns);
      }
    }
  });

  it('uses only marks the art baker knows how to colour', () => {
    for (const row of drawTranscript(TRANSCRIPT_COLUMNS, TRANSCRIPT_ROWS, STILL_MOMENT).rows) {
      expect(row).toMatch(/^[.0-7]+$/);
    }
  });

  it('draws the same page every time', () => {
    expect(drawTranscript(TRANSCRIPT_COLUMNS, TRANSCRIPT_ROWS, STILL_MOMENT)).toEqual(
      drawTranscript(TRANSCRIPT_COLUMNS, TRANSCRIPT_ROWS, STILL_MOMENT),
    );
  });

  it('shows all four kinds of coding, one colour each', () => {
    const page = drawTranscript(TRANSCRIPT_COLUMNS, TRANSCRIPT_ROWS, STILL_MOMENT);

    expect(new Set(CODED_MARKS).size).toBe(4);
    for (const mark of CODED_MARKS) {
      expect(countMarks(page.rows, [mark])).toBeGreaterThan(0);
    }
  });
});

describe('the lines of the transcript', () => {
  it('has the tutor and the student taking turns', () => {
    const speakers = transcriptLines().map((line) => line.speaker);

    expect(speakers).toContain('tutor');
    expect(speakers).toContain('student');
    expect(speakers.every((speaker, index) => index === 0 || speaker !== speakers[index - 1])).toBe(true);
  });

  it('gives the tutor most of the words', () => {
    const wordsBy = (speaker: string) => transcriptLines()
      .filter((line) => line.speaker === speaker)
      .reduce((total, line) => total + line.width, 0);

    expect(wordsBy('tutor')).toBeGreaterThan(wordsBy('student') * 1.5);
  });

  it('colours the tutor’s placeholders more than anything the student says', () => {
    const codedBy = (speaker: string) => transcriptLines()
      .filter((line) => line.speaker === speaker)
      .reduce((total, line) => total + line.highlights.reduce((sum, mark) => sum + mark.width, 0), 0);

    expect(codedBy('tutor')).toBeGreaterThan(codedBy('student'));
  });

  it('keeps every highlight inside the line it marks', () => {
    for (const line of transcriptLines()) {
      for (const mark of line.highlights) {
        expect(mark.offset).toBeGreaterThanOrEqual(0);
        expect(mark.offset + mark.width).toBeLessThanOrEqual(line.width);
      }
    }
  });

  it('keeps every line inside the page', () => {
    for (const line of transcriptLines()) {
      expect(line.column + line.width).toBeLessThanOrEqual(TRANSCRIPT_COLUMNS);
      expect(line.row + 2).toBeLessThanOrEqual(TRANSCRIPT_ROWS);
    }
  });
});

describe('typing out and coding the transcript', () => {
  const written = (elapsed: number, mark: string) => transcriptScene(elapsed).filter((shape) => shape.mark === mark);

  it('starts from a page with the line numbers but nothing written or coded', () => {
    const base = drawTranscriptBase(TRANSCRIPT_COLUMNS, TRANSCRIPT_ROWS);

    expect(countMarks(base.rows, [...CODED_MARKS, TEXT_MARK])).toBe(0);
  });

  it('is fully written and coded once everything has been typed', () => {
    const still = drawTranscript(TRANSCRIPT_COLUMNS, TRANSCRIPT_ROWS, STILL_MOMENT);

    expect(still).not.toEqual(drawTranscriptBase(TRANSCRIPT_COLUMNS, TRANSCRIPT_ROWS));
    for (const mark of CODED_MARKS) {
      expect(countMarks(still.rows, [mark])).toBeGreaterThan(0);
    }
  });

  it('types each line out from the left, a little further each moment', () => {
    const reach = (elapsed: number) => Math.max(0, ...written(elapsed, TEXT_MARK).filter((shape) => shape.row === transcriptLines()[0].row).map((shape) => shape.width));

    expect(reach(100)).toBeGreaterThan(0);
    expect(reach(300)).toBeGreaterThan(reach(100));
    expect(reach(STEP)).toBe(transcriptLines()[0].width);
  });

  it('types the lines one after another', () => {
    const rowsWritten = (elapsed: number) => new Set(written(elapsed, TEXT_MARK).map((shape) => shape.row)).size;

    expect(rowsWritten(STEP / 2)).toBe(1);
    expect(rowsWritten(STEP * 3 + 10)).toBe(4);
    expect(rowsWritten(STILL_MOMENT)).toBe(transcriptLines().length);
  });

  it('codes a line only once it has been typed', () => {
    const first = transcriptLines()[0];
    const codedRows = (elapsed: number) => transcriptScene(elapsed).filter((shape) => CODED_MARKS.includes(shape.mark) && shape.row === first.row);

    expect(codedRows(STEP * 0.3)).toHaveLength(0);
    expect(codedRows(STEP - 1)).toHaveLength(first.highlights.length);
  });

  it('shows a cursor while typing and none once it is done', () => {
    expect(written(STEP / 2, CURSOR_MARK).length).toBeGreaterThan(0);
    expect(written(STILL_MOMENT, CURSOR_MARK)).toHaveLength(0);
  });

  it('holds the finished page before it starts again', () => {
    expect(TRANSCRIPT_LOOP).toBeGreaterThan(STILL_MOMENT);
    expect(transcriptScene(TRANSCRIPT_LOOP - 1)).toEqual(transcriptScene(STILL_MOMENT));
  });

  it('keeps every shape inside the page', () => {
    for (let elapsed = 0; elapsed <= STILL_MOMENT; elapsed += 50) {
      for (const shape of transcriptScene(elapsed)) {
        expect(shape.column).toBeGreaterThanOrEqual(0);
        expect(shape.column + shape.width).toBeLessThanOrEqual(TRANSCRIPT_COLUMNS);
        expect(shape.row + shape.height).toBeLessThanOrEqual(TRANSCRIPT_ROWS);
      }
    }
  });

  it('is short enough not to crowd the picture', () => {
    expect(transcriptLines().length).toBeLessThanOrEqual(9);
  });
});
