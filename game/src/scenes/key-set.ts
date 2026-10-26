import { Input } from 'phaser';
import { CAPTURED_KEYS } from '../input/key-bindings';

export class KeySet {
  private readonly keys: Phaser.Input.Keyboard.Key[];

  constructor(keyboard: Phaser.Input.Keyboard.KeyboardPlugin, codes: readonly number[]) {
    this.keys = codes.map((code) => keyboard.addKey(code, CAPTURED_KEYS.includes(code)));
  }

  get isDown(): boolean {
    return this.keys.some((key) => key.isDown);
  }

  get timeDown(): number {
    return Math.max(...this.keys.map((key) => (key.isDown ? key.timeDown : 0)));
  }

  justDown(): boolean {
    return this.keys.map((key) => Input.Keyboard.JustDown(key)).some(Boolean);
  }
}
