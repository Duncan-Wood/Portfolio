// A missing entry does not throw: Phaser treats an undefined fill as unfilled,
// so that tile type renders as an invisible hole. `palette.test.ts` pins them.
export const PIECE_COLORS = [0xe4572e, 0x17bebb, 0xffc914, 0x8a4fff];

export type PieceShape = 'pad' | 'via' | 'chip' | 'branch';

export const PIECE_SHAPES: readonly PieceShape[] = ['pad', 'via', 'chip', 'branch'];

export function mix(color: number, toward: number, amount: number): number {
  const blend = (shift: number): number => {
    const from = (color >> shift) & 0xff;
    const to = (toward >> shift) & 0xff;
    return Math.round(from + (to - from) * amount) << shift;
  };

  return blend(16) | blend(8) | blend(0);
}

export const TRACE_COLORS = PIECE_COLORS.map((color) => mix(color, 0xffffff, 0.35));

export const GROUND_COLOR = 0x221038;

export const TRACK_COLOR = 0x3b2352;

export const TRACK_LIT_COLOR = 0xc98cff;

export const EMPTY_COLOR = 0x241038;

export const NEURON_COLOR = 0x6d4f96;

export const NEURON_LIT_COLOR = TRACK_LIT_COLOR;

export const SHADOW_COLOR = 0x0d0714;

export const SHADOW_BODY_COLOR = 0x1a0e2e;

export const SHADOW_EDGE_COLOR = 0x7d54b8;

export const SHADOW_EYE_COLOR = 0xf4eeff;

export const SHADOW_EYE_GLOW = 0xb07dff;
