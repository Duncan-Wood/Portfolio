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
 * These four are drawn from ONE vocabulary on purpose: the parts of a circuit.
 * A pad, an open via, a chip, a branching trace. The first pass here used a
 * star, a circle, a square and a diamond, which read fine and meant nothing —
 * that is Bejeweled's vocabulary, and borrowing it made the board generic. A
 * tile in this game is a node in a network, so it should look like one.
 *
 * Indexed by piece type, like the colours, and held to the same one-per-type
 * test for the same reason.
 */
export type PieceShape = 'pad' | 'via' | 'chip' | 'branch';

export const PIECE_SHAPES: readonly PieceShape[] = ['pad', 'via', 'chip', 'branch'];

/**
 * Blend `color` toward `toward` by `amount` (0 = unchanged, 1 = fully
 * `toward`). Here rather than in the scene so it stays Phaser-free: the trace
 * colours below are data, and the tile baking needs the same arithmetic.
 */
export function mix(color: number, toward: number, amount: number): number {
  const blend = (shift: number): number => {
    const from = (color >> shift) & 0xff;
    const to = (toward >> shift) & 0xff;
    return Math.round(from + (to - from) * amount) << shift;
  };

  return blend(16) | blend(8) | blend(0);
}

/**
 * The colour a lit connection is drawn in — the tile's own colour, pushed
 * toward white so the trace reads as current running through it rather than as
 * more tile.
 */
export const TRACE_COLORS = PIECE_COLORS.map((color) => mix(color, 0xffffff, 0.35));

/**
 * The ground the whole canvas sits on.
 *
 * The portfolio's own deep purple rather than the neutral slate it started as.
 * The game and the site were visibly two different products, and one shared
 * ground is the cheapest thing that makes them one.
 */
export const GROUND_COLOR = 0x221038;

/**
 * The progress track that rings the board: its dormant colour, and the colour
 * of the part that has been energised.
 *
 * Lit is the portfolio's own purple, lightened so it separates from the purple
 * PIECE type sitting on the board beside it.
 */
export const TRACK_COLOR = 0x3b2352;

export const TRACK_LIT_COLOR = 0xc98cff;

/** An unoccupied cell. Drawn rather than left blank so the grid stays legible. */
export const EMPTY_COLOR = 0x241038;

/**
 * A neuron, dark and lit.
 *
 * Dark was the track colour the board's dormant wiring is printed in, on the
 * theory that an unreached neuron IS a part of the network with nothing running
 * through it. That theory produced a cell nobody could see: it matched the
 * substrate so closely that tiles resting on one looked like they were floating
 * and the board read as broken. An unlit neuron has to be quieter than a tile
 * and louder than a hole, and this is well up from where it started.
 *
 * Lit is the same violet the brain's earned nodes use, and deliberately not a
 * new colour. The neuron on the board and the node on the panel are the same
 * thing at two scales: reaching one here lights one there, and a player should
 * be able to see that without being told.
 */
export const NEURON_COLOR = 0x6d4f96;

export const NEURON_LIT_COLOR = TRACK_LIT_COLOR;

/**
 * A cell the shadow holds — the pit it is crouching in. Darker than an empty
 * one on purpose: an empty cell is room to work in, and this is the absence of
 * room.
 */
export const SHADOW_COLOR = 0x0d0714;

/**
 * The creature itself, and the light along its edge.
 *
 * Its body is a shade LIGHTER than the pit behind it, which is the whole reason
 * it is visible at all: black on black is a shape nobody can see, and the first
 * version of the shadow — a near-black square with a hairline outline — read as
 * a rendering fault rather than as a thing on the board.
 *
 * Both are violet, and that is the point rather than convenience. The
 * antagonist is not an invader from outside; it is the part of this mind that
 * stops without finishing, so it is lit in the same purple as the ground it
 * stands on and the track that rings the board. Yellow eyes would have made it
 * someone else's monster.
 */
export const SHADOW_BODY_COLOR = 0x1a0e2e;

export const SHADOW_EDGE_COLOR = 0x7d54b8;

/**
 * Its eyes: a near-white core in a violet halo.
 *
 * The one bright thing in the cell, and the only part of the design doing the
 * work at a glance — a player scanning the board for somewhere to build reads
 * two lit dots long before they read a silhouette.
 */
export const SHADOW_EYE_COLOR = 0xf4eeff;

export const SHADOW_EYE_GLOW = 0xb07dff;
