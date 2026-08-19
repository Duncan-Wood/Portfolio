/* Board dimensions and the size of the colour set. */

export const COLUMNS = 6;

/** How many rows the player can actually see. */
export const VISIBLE_ROWS = 12;

/**
 * Puyo's "Ghost Puyo" row: rows above the visible field where a tile can rest
 * but stays inert — it is not drawn, and it does not take part in matches.
 *
 * It buys three things. Breathing room, so the stack reaching the top is not
 * instantly fatal. A sharp game-over rule ("the spawn cell is occupied") rather
 * than the board silently overwriting itself. And the expert technique of
 * completing a group whose last tile sits up here, inert, until something below
 * clears and it falls into the visible field — which is where chains that fire
 * on a delay come from.
 *
 * It also closes a real bug: a pair used to spawn with its satellite at row -1,
 * off the board entirely, and `lock()` silently discarded that half. With a
 * hidden row the satellite spawns INSIDE the board, so there is nothing to lose.
 */
export const HIDDEN_ROWS = 1;

/**
 * Row 0 is the TOP; gravity increases the row number. This is the opposite of
 * the maths convention, and is deliberate: it matches how the board is drawn
 * and indexed, so `row + 1` always means "one row down the screen".
 */
export const ROWS = VISIBLE_ROWS + HIDDEN_ROWS;

/** The first row the player can see. Rows above it are the hidden field. */
export const FIRST_VISIBLE_ROW = HIDDEN_ROWS;

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
