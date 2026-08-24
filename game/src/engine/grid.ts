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

/**
 * The shadow: a cell that is occupied but belongs to no colour.
 *
 * Numbered past the real types rather than given a type of its own, so every
 * board cell stays one `number | null` and nothing that reads the board has to
 * learn a second shape. What makes it the antagonist is what it CANNOT do — it
 * never joins a group, so it never clears itself, and it severs the connection
 * between whatever it sits between.
 *
 * See `docs/ART-DIRECTION.md` under "By stage": the shadow is the part of this
 * mind that stops without finishing, and the more of the board it holds, the
 * less of it is connected.
 */
export const SHADOW = PIECE_TYPE_COUNT;

/**
 * How many hits the strongest shadow survives.
 *
 * TWO, and the reason is a measured one. The damage a link deals is its depth,
 * so a third tier would need a 3-link chain to remove in one go — and a bot
 * playing this engine greedily produced ZERO chains of 2+ across 26 pieces,
 * with accidental 2-chains landing about once in ten. A tier that in practice
 * needs three separate clears against the same cell, while more of them keep
 * arriving, is not a hard tier; it is a tier the board wins.
 *
 * The rule this enforces: a single clear always makes progress against
 * anything on the board, and a chain is the FASTER answer, never the only one.
 * A threat whose only answer is a skill most players do not have is not
 * difficulty.
 */
export const MAX_SHADOW_STRENGTH = 2;

/**
 * A shadow does not sit in an empty cell. It POSSESSES a tile, and it
 * remembers the colour it is standing on.
 *
 * This is the whole character of the antagonist expressed as a number. It
 * arrives by taking something you already built rather than by dropping more
 * junk on the board, so it genuinely severs the connections between whatever
 * it sits between — which is what this file claimed it did long before it
 * could. Driving it off RESTORES that colour rather than inventing one, so
 * fighting it gives you back what was yours.
 *
 * Encoded as one number, still, for the reason `SHADOW` always was: every
 * board cell stays a single `number | null` and nothing that reads the board
 * has to learn a second shape. The layout is
 * `SHADOW + (strength - 1) * PIECE_TYPE_COUNT + heldColour`, so the values run
 * from `SHADOW` to `SHADOW + MAX_SHADOW_STRENGTH * PIECE_TYPE_COUNT - 1`.
 * `isColour` is unchanged and still `< PIECE_TYPE_COUNT`, so every existing
 * caller kept working.
 */
const SHADOW_VALUES = MAX_SHADOW_STRENGTH * PIECE_TYPE_COUNT;

/**
 * Whether a cell holds a shadow of any strength, over any colour.
 *
 * The counterpart to `isColour`, and the reason both exist as predicates: the
 * shadow deliberately shares the number space the colour tables are indexed
 * by, so `=== SHADOW` written at a call site silently stopped being true the
 * moment a shadow could be strength 2 or could be holding teal.
 */
export function isShadow(pieceType: number | null): pieceType is number {
  return pieceType !== null
    && pieceType >= SHADOW
    && pieceType < SHADOW + SHADOW_VALUES;
}

/** The cell value for a shadow of `strength` standing on `holding`. */
export function shadowCell(strength: number, holding: number): number {
  const tier = Math.min(Math.max(strength, 1), MAX_SHADOW_STRENGTH) - 1;
  return SHADOW + tier * PIECE_TYPE_COUNT + holding;
}

/** How many more hits this shadow takes. Meaningless unless `isShadow`. */
export function shadowStrength(pieceType: number): number {
  return Math.floor((pieceType - SHADOW) / PIECE_TYPE_COUNT) + 1;
}

/** The colour underneath this shadow. Meaningless unless `isShadow`. */
export function shadowHolding(pieceType: number): number {
  return (pieceType - SHADOW) % PIECE_TYPE_COUNT;
}

/**
 * Whether a cell holds one of the playable colours, as opposed to nothing or
 * one of the occupants that has no colour.
 *
 * A predicate rather than `!== SHADOW` written at each site, because `SHADOW`
 * deliberately shares the number space that `PIECE_COLORS` and `TRACE_COLORS`
 * are indexed by. `PIECE_COLORS[SHADOW]` is `undefined`, and Phaser's
 * `setTint(undefined)` does not throw — it silently mis-renders, which is the
 * exact failure `palette.ts` was written to prevent. ART-DIRECTION's Stage 4
 * names two more colourless occupants to come, so every one of those sites
 * should be asking this question rather than naming today's only answer.
 */
export function isColour(pieceType: number | null): pieceType is number {
  return pieceType !== null && pieceType < PIECE_TYPE_COUNT;
}
