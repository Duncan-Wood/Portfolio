import { describe, expect, it } from 'vitest';
import { TouchControls } from './touch-controls';

describe('one-shot actions', () => {
  it('reports a drop once per tap, however many frames read it', () => {
    const touch = new TouchControls();
    touch.press('drop');

    expect(touch.takeDrop()).toBe(true);
    expect(touch.takeDrop()).toBe(false);
  });

  it('reports a second drop after another tap', () => {
    const touch = new TouchControls();
    touch.press('drop');
    touch.takeDrop();
    touch.press('drop');

    expect(touch.takeDrop()).toBe(true);
  });

  it('keeps drop, pause and restart independent', () => {
    const touch = new TouchControls();
    touch.press('pause');

    expect(touch.takeDrop()).toBe(false);
    expect(touch.takeRestart()).toBe(false);
    expect(touch.takePause()).toBe(true);
  });
});
