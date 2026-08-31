/* Board dimensions and the size of the colour set. */

export const COLUMNS = 6;

/** How many rows the player can actually see. */
export const VISIBLE_ROWS = 12;

/** invisible row above board */
export const HIDDEN_ROWS = 1;

export const ROWS = VISIBLE_ROWS + HIDDEN_ROWS;

/** Rows above it are the hidden field. */
export const FIRST_VISIBLE_ROW = HIDDEN_ROWS;

/**
 * Piece types are plain integers `0..PIECE_TYPE_COUNT - 1`, which is what keeps
 * the engine ignorant of colour — `palette.ts` maps them to actual colours.
 *
 * Raising this requires adding a colour to `PIECE_COLORS` in `palette.ts`;
 * `palette.test.ts` enforces that they match.
 */
export const PIECE_TYPE_COUNT = 4;

/**
 * A cell that is occupied but belongs to no colour. It never joins a group, so
 * it never clears itself, and it severs the connection between whatever it sits
 * between.
 */
export const SHADOW = PIECE_TYPE_COUNT;

/**
 * How many hits the strongest shadow survives.
 */
export const MAX_SHADOW_STRENGTH = 2;

/**
 * A shadow possesses a tile and remembers the colour underneath it. Encoded as
 * one number so every board cell stays a single `number | null` and nothing
 * that reads the board has to learn a second shape.
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
 * A neuron: the goal, sitting in a cell.
 *
 * Activated by popping an adjacent block.
 *
 * Encoded past the shadow values, for the same reason the shadow is encoded
 * past the colours: every board cell stays one `number | null`.
 */
export const NEURON = SHADOW + SHADOW_VALUES;

const NEURON_VALUES = 2;

/** The cell value for a neuron, lit or not. */
export function neuronCell(lit: boolean): number {
  return lit ? NEURON + 1 : NEURON;
}

export function isNeuron(pieceType: number | null): pieceType is number {
  return pieceType !== null
    && pieceType >= NEURON
    && pieceType < NEURON + NEURON_VALUES;
}

/** Whether this neuron has been reached. Meaningless unless `isNeuron`. */
export function isNeuronLit(pieceType: number): boolean {
  return pieceType === NEURON + 1;
}

/** Whether a cell is fixed in place: it does not fall, and nothing falls past it. */
export function isAnchored(pieceType: number | null): boolean {
  return isNeuron(pieceType);
}

/**
 * Whether a cell holds one of the playable colours, as opposed to nothing or
 * one of the occupants that has no colour.
 */
export function isColour(pieceType: number | null): pieceType is number {
  return pieceType !== null && pieceType < PIECE_TYPE_COUNT;
}
