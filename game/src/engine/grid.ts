/*
 *   0..3   │   4..7    │   8    9
 * colours  │  shadow   │  neuron
 *          │ over 0..3 │ dark, lit
 *
 * Read cells with the predicates below, never by comparing to a band constant.
 */

export const COLUMNS = 6;

export const VISIBLE_ROWS = 12;

export const HIDDEN_ROWS = 1;

export const ROWS = VISIBLE_ROWS + HIDDEN_ROWS;

export const FIRST_VISIBLE_ROW = HIDDEN_ROWS;

export const PIECE_TYPE_COUNT = 4;

export const SHADOW = PIECE_TYPE_COUNT;

export function isShadow(pieceType: number | null): pieceType is number {
  return pieceType !== null
    && pieceType >= SHADOW
    && pieceType < SHADOW + PIECE_TYPE_COUNT;
}

export function shadowCell(holding: number): number {
  return SHADOW + holding;
}

export function shadowHolding(pieceType: number): number {
  return pieceType - SHADOW;
}

export const NEURON = SHADOW + PIECE_TYPE_COUNT;

const NEURON_VALUES = 2;

export function neuronCell(lit: boolean): number {
  return lit ? NEURON + 1 : NEURON;
}

export function isNeuron(pieceType: number | null): pieceType is number {
  return pieceType !== null
    && pieceType >= NEURON
    && pieceType < NEURON + NEURON_VALUES;
}

export function isNeuronLit(pieceType: number): boolean {
  return pieceType === NEURON + 1;
}

export function isAnchored(pieceType: number | null): boolean {
  return isNeuron(pieceType);
}

export function isColour(pieceType: number | null): pieceType is number {
  return pieceType !== null && pieceType < PIECE_TYPE_COUNT;
}
