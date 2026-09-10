import { describe, expect, it } from 'vitest';
import { SwipeControls, type SwipeTuning } from './swipe-controls';

const TUNING: SwipeTuning = {
  columnDistance: 40,
  tapMaxDistance: 12,
  tapMaxDuration: 260,
  dropMinDistance: 90,
  dropMaxDuration: 300,
};

function drain(controls: SwipeControls): string[] {
  const taken: string[] = [];
  for (let action = controls.take(); action !== null; action = controls.take()) {
    taken.push(action);
  }
  return taken;
}

describe('moving the pair by dragging', () => {
  it('steps once for each column-width the finger travels', () => {
    const controls = new SwipeControls(TUNING);

    controls.begin(100, 500, 0);
    controls.move(140, 500, 60);

    expect(drain(controls)).toEqual(['right']);
  });

  it('steps again without lifting, so one drag can cross the board', () => {
    const controls = new SwipeControls(TUNING);

    controls.begin(100, 500, 0);
    controls.move(140, 500, 60);
    controls.move(180, 500, 120);

    expect(drain(controls)).toEqual(['right', 'right']);
  });

  it('reports both steps when a fast drag skips past two thresholds at once', () => {
    const controls = new SwipeControls(TUNING);

    controls.begin(100, 500, 0);
    controls.move(185, 500, 40);

    expect(drain(controls)).toEqual(['right', 'right']);
  });

  it('goes the other way for a leftward drag', () => {
    const controls = new SwipeControls(TUNING);

    controls.begin(200, 500, 0);
    controls.move(160, 500, 60);

    expect(drain(controls)).toEqual(['left']);
  });

  it('turns around mid-drag without waiting to travel back to where it started', () => {
    const controls = new SwipeControls(TUNING);

    controls.begin(100, 500, 0);
    controls.move(140, 500, 60);
    controls.move(100, 500, 120);

    expect(drain(controls)).toEqual(['right', 'left']);
  });

  it('says nothing for a drag too short to cross a column', () => {
    const controls = new SwipeControls(TUNING);

    controls.begin(100, 500, 0);
    controls.move(130, 500, 60);

    expect(drain(controls)).toEqual([]);
  });
});

describe('tapping to rotate', () => {
  it('rotates when a finger goes down and up in one place', () => {
    const controls = new SwipeControls(TUNING);

    controls.begin(100, 500, 0);
    controls.end(103, 502, 90);

    expect(drain(controls)).toEqual(['rotate']);
  });

  it('does not rotate when the finger travelled, which was a drag', () => {
    const controls = new SwipeControls(TUNING);

    controls.begin(100, 500, 0);
    controls.move(150, 500, 60);
    controls.end(150, 500, 90);

    expect(drain(controls)).toEqual(['right']);
  });

  it('does not rotate when the finger rested, which was a hold', () => {
    const controls = new SwipeControls(TUNING);

    controls.begin(100, 500, 0);
    controls.end(100, 500, 900);

    expect(drain(controls)).toEqual([]);
  });
});

describe('flicking down to drop', () => {
  it('drops on a fast downward flick', () => {
    const controls = new SwipeControls(TUNING);

    controls.begin(100, 400, 0);
    controls.move(100, 500, 120);

    expect(drain(controls)).toEqual(['drop']);
  });

  it('ignores a slow downward drag, which is someone steadying their hand', () => {
    const controls = new SwipeControls(TUNING);

    controls.begin(100, 400, 0);
    controls.move(100, 500, 800);

    expect(drain(controls)).toEqual([]);
  });

  it('drops only once, however far the finger keeps going', () => {
    const controls = new SwipeControls(TUNING);

    controls.begin(100, 400, 0);
    controls.move(100, 500, 120);
    controls.move(100, 700, 200);

    expect(drain(controls)).toEqual(['drop']);
  });

  it('does not rotate on the lift after a drop', () => {
    const controls = new SwipeControls(TUNING);

    controls.begin(100, 400, 0);
    controls.move(100, 500, 120);
    controls.end(100, 500, 140);

    expect(drain(controls)).toEqual(['drop']);
  });

  it('leaves a sideways drag alone even when it drifts down a little', () => {
    const controls = new SwipeControls(TUNING);

    controls.begin(100, 500, 0);
    controls.move(180, 530, 100);

    expect(drain(controls)).toEqual(['right', 'right']);
  });
});

describe('a gesture that is interrupted', () => {
  it('forgets a cancelled gesture rather than firing it on the next touch', () => {
    const controls = new SwipeControls(TUNING);

    controls.begin(100, 500, 0);
    controls.cancel();
    controls.end(103, 502, 90);

    expect(drain(controls)).toEqual([]);
  });

  it('ignores movement that arrives before any finger went down', () => {
    const controls = new SwipeControls(TUNING);

    controls.move(300, 500, 40);
    controls.end(300, 500, 60);

    expect(drain(controls)).toEqual([]);
  });

  it('hands actions out one at a time, so a frame takes what it can use', () => {
    const controls = new SwipeControls(TUNING);

    controls.begin(100, 500, 0);
    controls.move(185, 500, 40);

    expect(controls.take()).toBe('right');
    expect(controls.take()).toBe('right');
    expect(controls.take()).toBeNull();
  });
});
