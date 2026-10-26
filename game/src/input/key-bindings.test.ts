import { describe, expect, it } from 'vitest';
import { CAPTURED_KEYS, KEY_BINDINGS, KeyCode, type KeyAction } from './key-bindings';

const playActions: KeyAction[] = ['moveLeft', 'moveRight', 'rotate', 'softDrop', 'hardDrop', 'pause'];

describe('the keys that play the game', () => {
  it('moves with the arrow keys or with A and D', () => {
    expect(KEY_BINDINGS.moveLeft).toEqual([KeyCode.LEFT, KeyCode.A]);
    expect(KEY_BINDINGS.moveRight).toEqual([KeyCode.RIGHT, KeyCode.D]);
  });

  it('rotates with up or W and speeds up with down or S', () => {
    expect(KEY_BINDINGS.rotate).toEqual([KeyCode.UP, KeyCode.W]);
    expect(KEY_BINDINGS.softDrop).toEqual([KeyCode.DOWN, KeyCode.S]);
  });

  it('pauses with escape or P', () => {
    expect(KEY_BINDINGS.pause).toEqual([KeyCode.ESC, KeyCode.P]);
  });

  it('never gives one key two jobs during play', () => {
    const keys = playActions.flatMap((action) => KEY_BINDINGS[action]);

    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('continuing past a card', () => {
  it('accepts space, enter or Z', () => {
    expect(KEY_BINDINGS.confirm).toEqual([KeyCode.SPACE, KeyCode.ENTER, KeyCode.Z]);
  });
});

describe('which keys the page stops the browser from using', () => {
  it('holds back only the keys that would scroll the page', () => {
    expect([...CAPTURED_KEYS].sort()).toEqual(
      [KeyCode.SPACE, KeyCode.LEFT, KeyCode.UP, KeyCode.RIGHT, KeyCode.DOWN].sort(),
    );
  });

  it('leaves letters alone, so browser shortcuts like save and print still work', () => {
    for (const letter of [KeyCode.A, KeyCode.D, KeyCode.W, KeyCode.S, KeyCode.Z, KeyCode.P]) {
      expect(CAPTURED_KEYS).not.toContain(letter);
    }
  });
});
