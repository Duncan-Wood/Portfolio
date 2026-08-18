export const FIXED_STEP = 1000 / 60;
export const MAX_FRAME_DELTA = 100;

export class FixedTimestep {
  private accumulator = 0;

  constructor(
    private step: number = FIXED_STEP,
    private maxFrameDelta: number = MAX_FRAME_DELTA,
  ) {}

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
