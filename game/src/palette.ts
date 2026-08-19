/*
 * How piece types map to colours on screen.
 *
 * Separate from the scene so it contains no Phaser and can therefore be
 * unit-tested — specifically, that there is exactly one colour per piece type.
 * That test is not pedantry: `PIECE_TYPE_COUNT` and this array were previously
 * kept in sync by hand, and raising the count to 5 would have made
 * `PIECE_COLORS[4]` `undefined`. Phaser's `setFillStyle(undefined)` does not
 * throw — it silently marks the shape unfilled — so one tile in five would have
 * rendered as an invisible hole, with no error anywhere.
 *
 * Indexed by piece type, so `PIECE_COLORS[2]` is the colour of type 2. Chosen
 * to stay distinguishable at speed, which the art direction rates above beauty:
 * readability beats prettiness in a game built on fast pattern recognition.
 */
export const PIECE_COLORS = [0xe4572e, 0x17bebb, 0xffc914, 0x8a4fff];

/**
 * The figure stamped into each piece type's tile.
 *
 * Colour alone is not enough to tell four tile types apart. Around one man in
 * twelve cannot reliably separate the red from the teal, and under time
 * pressure everybody reads a silhouette faster than a hue — which matters in a
 * game whose whole skill is spotting groups at speed.
 *
 * The storyboard drew the board this way from the first panel: panes with
 * figures in them, not flat swatches. Indexed by piece type, like the colours,
 * and held to the same one-per-type test for the same reason.
 */
export type PieceShape = 'star' | 'circle' | 'square' | 'diamond';

export const PIECE_SHAPES: readonly PieceShape[] = ['star', 'circle', 'square', 'diamond'];

/** An unoccupied cell. Drawn rather than left blank so the grid stays legible. */
export const EMPTY_COLOR = 0x1c2228;
