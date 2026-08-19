/*
 * Converts real elapsed time into a whole number of fixed simulation steps.
 *
 * WHY A FIXED TIMESTEP: the browser hands you a frame delta that varies —
 * 8.3ms on a 120Hz display, 16.7ms at 60Hz, more if something hiccuped. Feeding
 * that raw into game logic makes the game behave differently on different
 * machines and impossible to reproduce or test. Instead, real time is banked
 * and spent in identical chunks, so the simulation only ever sees exactly one
 * step size. A 120Hz machine runs a step every other frame, a 60Hz machine one
 * per frame, a stuttering machine several in a row — same outcome everywhere.
 */

/** One simulation step: 60 steps per second of game time. */
export const FIXED_STEP = 1000 / 60;

/**
 * The largest frame delta that may enter the accumulator.
 *
 * Clamping before accumulating is part of what a fixed-timestep loop IS, not a
 * defensive guard. Without it the number of steps per frame is unbounded from
 * this code's point of view, and a single huge delta would both freeze the page
 * and advance the game by a wild amount. Phaser happens to smooth deltas on its
 * own, but relying on that would put this loop's iteration bound in a
 * third-party config file rather than here.
 */
export const MAX_FRAME_DELTA = 100;

export class FixedTimestep {
  private accumulator = 0;

  constructor(
    private step: number = FIXED_STEP,
    private maxFrameDelta: number = MAX_FRAME_DELTA,
  ) {}

  /**
   * Bank one frame's elapsed time and return how many whole steps to run now.
   *
   * The sub-step remainder carries to the next frame, so the simulation runs at
   * true speed despite advancing in jumps. The deliberate exception is the clamp
   * above, which discards anything past `maxFrameDelta`.
   */
  stepsFor(frameDelta: number): number {
    this.accumulator += Math.min(frameDelta, this.maxFrameDelta);

    let steps = 0;
    while (this.accumulator >= this.step) {
      this.accumulator -= this.step;
      steps += 1;
    }
    return steps;
  }

  reset(): void {
    this.accumulator = 0;
  }
}
