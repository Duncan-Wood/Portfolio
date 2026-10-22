export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export const TITLE_Y = 96;
export const LINE_Y = 132;
export const STAR_TITLE_Y = 508;
export const CONTACT_Y = 596;
export const PLAY_AGAIN_Y = 660;
export const RESET_Y = 722;

const around = (centerY: number, halfWidth: number, halfHeight: number): Rect => ({
  left: 310 - halfWidth,
  top: centerY - halfHeight,
  right: 310 + halfWidth,
  bottom: centerY + halfHeight,
});

export const VICTORY_TEXT_AND_BUTTONS: readonly Rect[] = [
  { left: 30, top: 40, right: 590, bottom: 205 },
  around(STAR_TITLE_Y, 80, 16),
  around(CONTACT_Y, 114, 24),
  around(PLAY_AGAIN_Y, 84, 24),
  around(RESET_Y, 104, 24),
];
