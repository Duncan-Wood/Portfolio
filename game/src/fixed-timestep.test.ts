import { describe, expect, it } from 'vitest';
import { FIXED_STEP, FixedTimestep, MAX_FRAME_DELTA } from './fixed-timestep';

describe('the fixed timestep accumulator', () => {
  it('runs one step per frame at the step rate', () => {
    const timestep = new FixedTimestep();
    expect(timestep.stepsFor(FIXED_STEP)).toBe(1);
  });

  it('runs no step until a whole step has accumulated', () => {
    const timestep = new FixedTimestep();
    expect(timestep.stepsFor(FIXED_STEP / 2)).toBe(0);
  });

  it('carries the remainder into the next frame rather than losing it', () => {
    const timestep = new FixedTimestep();
    timestep.stepsFor(FIXED_STEP / 2);
    expect(timestep.stepsFor(FIXED_STEP / 2)).toBe(1);
  });

  it('runs two steps on a 120Hz display only every other frame', () => {
    const timestep = new FixedTimestep();
    const halfFrame = FIXED_STEP / 2;
    expect(timestep.stepsFor(halfFrame)).toBe(0);
    expect(timestep.stepsFor(halfFrame)).toBe(1);
  });

  it('bounds the steps a single frame can produce, however large the delta', () => {
    const timestep = new FixedTimestep();
    const steps = timestep.stepsFor(10_000);
    expect(steps).toBeLessThanOrEqual(Math.ceil(MAX_FRAME_DELTA / FIXED_STEP));
  });

  it('discards the time beyond the clamp instead of banking it', () => {
    const timestep = new FixedTimestep();
    timestep.stepsFor(10_000);
    expect(timestep.stepsFor(0)).toBe(0);
  });
});
