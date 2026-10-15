export const READER_TOP = 40;
// 72px above the found row, which BoardScene places at FOUND_ROW_Y.
export const READER_BOTTOM = 538;
export const READER_TEXT_WIDTH = 480;
export const READER_PICTURE_MAX_WIDTH = 368;
export const READER_PICTURE_MAX_HEIGHT = 200;
export const READER_PICTURE_MIN_HEIGHT = 120;
export const READER_PICTURE_GAP = 22;

export const READER_OVERHANG = 32;

export const CHARS_PER_LINE = 46;
const FIRST_LINE_HEIGHT = 19.7;
const LINE_PITCH = 26.7;

export function linesNeeded(body: string): number {
  return body.split('\n').reduce((total, paragraph) => {
    let lines = 1;
    let used = 0;

    for (const word of paragraph.split(' ').filter((piece) => piece !== '')) {
      const needed = used === 0 ? word.length : used + 1 + word.length;
      if (needed > CHARS_PER_LINE && used > 0) {
        lines += 1;
        used = word.length;
      } else {
        used = needed;
      }
    }

    return total + lines;
  }, 0);
}

export function pictureDisplayHeight(columns: number | undefined, rows: number | undefined): number {
  if (columns === undefined || rows === undefined) {
    return 0;
  }
  return Math.min(READER_PICTURE_MAX_HEIGHT, (READER_PICTURE_MAX_WIDTH * rows) / columns);
}

export function textHeight(lines: number): number {
  return FIRST_LINE_HEIGHT + LINE_PITCH * (lines - 1);
}

export function pictureRoom(bodyHeight: number): number {
  const room = READER_BOTTOM - READER_TOP - READER_PICTURE_GAP - bodyHeight;
  return Math.max(READER_PICTURE_MIN_HEIGHT, Math.min(READER_PICTURE_MAX_HEIGHT, room));
}

export function spareHeight(pictureHeight: number, lines: number): number {
  const gap = pictureHeight > 0 ? READER_PICTURE_GAP : 0;
  return READER_BOTTOM - READER_TOP - pictureHeight - gap - textHeight(lines);
}

export function fitsReader(pictureHeight: number, lines: number): boolean {
  const shown = pictureHeight > 0 ? Math.min(pictureHeight, pictureRoom(textHeight(lines))) : 0;
  return spareHeight(shown, lines) >= -2 * READER_OVERHANG;
}
