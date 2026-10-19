import { describe, expect, it } from 'vitest';
import {
  CODED_MARKS,
  TRANSCRIPT_COLUMNS,
  TRANSCRIPT_ROWS,
  drawTranscript,
  transcriptLines,
} from './transcript-page';

const countMarks = (rows: readonly string[], marks: readonly string[]) => (
  rows.join('').split('').filter((mark) => marks.includes(mark)).length
);

describe('drawing the coded transcript', () => {
  it('fills exactly the size asked for', () => {
    for (const [columns, rows] of [[TRANSCRIPT_COLUMNS, TRANSCRIPT_ROWS], [22, 13]]) {
      const page = drawTranscript(columns, rows);

      expect(page.columns).toBe(columns);
      expect(page.rows).toHaveLength(rows);
      for (const row of page.rows) {
        expect(row).toHaveLength(columns);
      }
    }
  });

  it('uses only marks the art baker knows how to colour', () => {
    for (const row of drawTranscript(TRANSCRIPT_COLUMNS, TRANSCRIPT_ROWS).rows) {
      expect(row).toMatch(/^[.0-7]+$/);
    }
  });

  it('draws the same page every time', () => {
    expect(drawTranscript(TRANSCRIPT_COLUMNS, TRANSCRIPT_ROWS)).toEqual(
      drawTranscript(TRANSCRIPT_COLUMNS, TRANSCRIPT_ROWS),
    );
  });

  it('shows all four kinds of coding, one colour each', () => {
    const page = drawTranscript(TRANSCRIPT_COLUMNS, TRANSCRIPT_ROWS);

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
