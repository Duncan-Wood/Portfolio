export const READER_TOP = 40;
// 72px above the found row, which BoardScene places at FOUND_ROW_Y.
export const READER_BOTTOM = 538;
export const READER_TEXT_WIDTH = 480;
export const READER_PICTURE_MAX_WIDTH = 368;
export const READER_FRAME_HEIGHT = 190;
export const READER_MAX_LINES = 10;
export const READER_PICTURE_GAP = 22;

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

export function textHeight(lines: number): number {
  return FIRST_LINE_HEIGHT + LINE_PITCH * (lines - 1);
}

const READER_BLOCK_HEIGHT = READER_FRAME_HEIGHT + READER_PICTURE_GAP + textHeight(READER_MAX_LINES);

export const READER_FRAME_TOP = Math.round((READER_TOP + READER_BOTTOM - READER_BLOCK_HEIGHT) / 2);
export const READER_TEXT_TOP = READER_FRAME_TOP + READER_FRAME_HEIGHT + READER_PICTURE_GAP;
