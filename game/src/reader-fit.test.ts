import { describe, expect, it } from 'vitest';
import {
  CHARS_PER_LINE,
  READER_BOTTOM,
  READER_FRAME_TOP,
  READER_MAX_LINES,
  READER_TEXT_TOP,
  READER_TOP,
  linesNeeded,
  textHeight,
} from './reader-fit';

describe('counting the lines a card needs', () => {
  it('puts a short sentence on one line', () => {
    expect(linesNeeded('I built it.')).toBe(1);
  });

  it('wraps at a word, never mid-word', () => {
    const word = 'a'.repeat(CHARS_PER_LINE - 2);

    expect(linesNeeded(`${word} b`)).toBe(1);
    expect(linesNeeded(`${word} bb`)).toBe(2);
  });

  it('counts the blank line between paragraphs', () => {
    expect(linesNeeded('one\n\ntwo')).toBe(3);
  });
});

describe('the room every card takes', () => {
  it('fits the picture frame and the longest allowed text between the top and the found row', () => {
    expect(READER_FRAME_TOP).toBeGreaterThanOrEqual(READER_TOP);
    expect(READER_TEXT_TOP + textHeight(READER_MAX_LINES)).toBeLessThanOrEqual(READER_BOTTOM);
  });

  it('centres that block between the top and the found row', () => {
    const above = READER_FRAME_TOP - READER_TOP;
    const below = READER_BOTTOM - (READER_TEXT_TOP + textHeight(READER_MAX_LINES));

    expect(Math.abs(above - below)).toBeLessThanOrEqual(1);
  });
});
