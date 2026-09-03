/*
 * Real elapsed time in, whole simulation steps out.
 *
 * The browser's frame delta varies with the display and the machine's load, so
 * feeding it raw into game logic makes the game behave differently on different
 * machines. Spending banked time in identical chunks means the simulation only
 * ever sees one step size.
 */

export const FIXED_STEP = 1000 / 60;

/**
 * The clamp is what bounds the loop below, not a defensive guard: without it one
 * huge delta freezes the page and advances the game wildly. Phaser smooths
 * deltas too, but that puts this loop's iteration bound in someone else's config.
 */
export const MAX_FRAME_DELTA = 100;

export class FixedTimestep {
  private accumulator = 0;

  constructor(
    private step: number = FIXED_STEP,
    private maxFrameDelta: number = MAX_FRAME_DELTA,
  ) {}

  /**
   * Bank one frame's time and return how many whole steps to run. The remainder
   * carries, so the simulation runs at true speed despite advancing in jumps.
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
