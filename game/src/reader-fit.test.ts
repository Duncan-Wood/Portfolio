import { describe, expect, it } from 'vitest';
import {
  CHARS_PER_LINE,
  READER_BOTTOM,
  READER_OVERHANG,
  READER_TOP,
  fitsReader,
  READER_PICTURE_MAX_HEIGHT,
  READER_PICTURE_MIN_HEIGHT,
  linesNeeded,
  pictureDisplayHeight,
  pictureRoom,
  textHeight,
  spareHeight,
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

describe('the picture above a card', () => {
  it('is capped at the reader’s picture height', () => {
    expect(pictureDisplayHeight(110, 147)).toBe(200);
  });

  it('keeps the picture’s shape when it is short and wide', () => {
    expect(pictureDisplayHeight(110, 48)).toBeLessThan(200);
  });

  it('is zero when a memory has no picture', () => {
    expect(pictureDisplayHeight(undefined, undefined)).toBe(0);
  });
});

describe('the room a card has', () => {
  it('shrinks by a picture and its gap', () => {
    const bare = spareHeight(0, 1);
    const withPicture = spareHeight(200, 1);

    expect(bare - withPicture).toBeGreaterThan(200);
  });

  it('shrinks with every extra line', () => {
    expect(spareHeight(0, 2)).toBeLessThan(spareHeight(0, 1));
  });

  it('goes negative once a card is too long to sit between the top and the found row', () => {
    expect(spareHeight(0, 1)).toBeGreaterThan(0);
    expect(spareHeight(0, 40)).toBeLessThan(0);
    expect(READER_BOTTOM).toBeGreaterThan(READER_TOP);
  });
});

describe('the room a picture gets', () => {
  it('gets the full height when the text is short', () => {
    expect(pictureRoom(textHeight(3))).toBe(READER_PICTURE_MAX_HEIGHT);
  });

  it('shrinks as the text grows', () => {
    expect(pictureRoom(textHeight(14))).toBeLessThan(pictureRoom(textHeight(10)));
  });

  it('never shrinks below a picture you can still make out', () => {
    expect(pictureRoom(textHeight(60))).toBe(READER_PICTURE_MIN_HEIGHT);
  });
});

describe('whether a card fits on screen', () => {
  it('fits a card that sits inside the reader area', () => {
    expect(fitsReader(200, 10)).toBe(true);
  });

  it('fits a long card by shrinking its picture', () => {
    expect(spareHeight(200, 14)).toBeLessThan(-2 * READER_OVERHANG);
    expect(fitsReader(200, 14)).toBe(true);
  });

  it('rejects a card too long even with the smallest picture', () => {
    expect(fitsReader(200, 20)).toBe(false);
  });
});
