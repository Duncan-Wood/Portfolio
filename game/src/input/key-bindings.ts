export const KeyCode = {
  ENTER: 13,
  ESC: 27,
  SPACE: 32,
  LEFT: 37,
  UP: 38,
  RIGHT: 39,
  DOWN: 40,
  A: 65,
  D: 68,
  P: 80,
  S: 83,
  W: 87,
  Z: 90,
} as const;

export const KEY_BINDINGS = {
  moveLeft: [KeyCode.LEFT, KeyCode.A],
  moveRight: [KeyCode.RIGHT, KeyCode.D],
  rotate: [KeyCode.UP, KeyCode.W],
  softDrop: [KeyCode.DOWN, KeyCode.S],
  hardDrop: [KeyCode.SPACE],
  confirm: [KeyCode.SPACE, KeyCode.ENTER, KeyCode.Z],
  pause: [KeyCode.ESC, KeyCode.P],
} as const;

export type KeyAction = keyof typeof KEY_BINDINGS;

export const CAPTURED_KEYS: readonly number[] = [
  KeyCode.SPACE,
  KeyCode.LEFT,
  KeyCode.UP,
  KeyCode.RIGHT,
  KeyCode.DOWN,
];
