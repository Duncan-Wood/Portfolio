import { describe, expect, it } from 'vitest';
import { TouchControls } from './touch-controls';

describe('holding a direction', () => {
  it('reports nothing until something is pressed', () => {
    expect(new TouchControls().direction).toBeNull();
  });

  it('holds the direction until it is released, so auto-shift can repeat', () => {
    const touch = new TouchControls();
    touch.press('left');

    expect(touch.direction).toBe(-1);
    expect(touch.direction).toBe(-1);

    touch.release('left');
    expect(touch.direction).toBeNull();
  });

  it('gives the newer press the board when both are held by two thumbs', () => {
    const touch = new TouchControls();
    touch.press('left');
    touch.press('right');

    expect(touch.direction).toBe(1);
  });

  it('falls back to the one still held when the newer is released', () => {
    const touch = new TouchControls();
    touch.press('left');
    touch.press('right');
    touch.release('right');

    expect(touch.direction).toBe(-1);
  });
});

describe('soft drop', () => {
  it('is held for as long as the button is', () => {
    const touch = new TouchControls();
    expect(touch.softDropHeld).toBe(false);

    touch.press('softDrop');
    expect(touch.softDropHeld).toBe(true);

    touch.release('softDrop');
    expect(touch.softDropHeld).toBe(false);
  });
});

describe('one-shot actions', () => {
  it('reports a rotate once per press, however many frames read it', () => {
    const touch = new TouchControls();
    touch.press('rotate');

    expect(touch.takeRotate()).toBe(true);
    expect(touch.takeRotate()).toBe(false);
  });

  it('reports a second rotate after the button is pressed again', () => {
    const touch = new TouchControls();
    touch.press('rotate');
    touch.takeRotate();
    touch.release('rotate');
    touch.press('rotate');

    expect(touch.takeRotate()).toBe(true);
  });

  it('keeps drop and rotate independent', () => {
    const touch = new TouchControls();
    touch.press('drop');

    expect(touch.takeRotate()).toBe(false);
    expect(touch.takeDrop()).toBe(true);
  });

  it('forgets everything when a finger leaves the screen mid-run', () => {
    const touch = new TouchControls();
    touch.press('left');
    touch.press('softDrop');
    touch.press('drop');

    touch.releaseAll();

    expect(touch.direction).toBeNull();
    expect(touch.softDropHeld).toBe(false);
    expect(touch.takeDrop()).toBe(false);
  });
});
