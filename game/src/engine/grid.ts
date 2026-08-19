/* Board dimensions and the size of the colour set. */

export const COLUMNS = 6;

/**
 * Row 0 is the TOP; gravity increases the row number. This is the opposite of
 * the maths convention, and is deliberate: it matches how the board is drawn
 * and indexed, so `row + 1` always means "one row down the screen".
 */
export const ROWS = 12;

/**
 * Piece types are plain integers `0..PIECE_TYPE_COUNT - 1`, which is what keeps
 * the engine ignorant of colour — `palette.ts` maps them to actual colours.
 *
 * Raising this requires adding a colour to `PIECE_COLORS` in `palette.ts`;
 * `palette.test.ts` enforces that they match.
 *
 * Four is Puyo standard. This was 6, and that was very likely the single
 * largest reason the game was not fun: on a board only 6 wide, six colours made
 * same-coloured tiles land adjacent too rarely for groups to form, so the board
 * filled before anything could clear.
 */
export const PIECE_TYPE_COUNT = 4;
