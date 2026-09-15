import { describe, expect, it } from 'vitest';
import { type HorizontalDirection, type InputFrame, InputTranslator } from './input-translator';

const TUNING = { autoShiftDelay: 130, autoRepeatInterval: 40 };
const FRAME = 16;

const frame = (overrides: Partial<InputFrame> = {}): InputFrame => ({
  direction: null,
  softDropHeld: false,
  newPiece: false,
  delta: FRAME,
  ...overrides,
});

const recordShifts = (succeeds: () => boolean = () => true) => {
  const shifts: HorizontalDirection[] = [];
  return {
    shifts,
    attempt: (direction: HorizontalDirection) => {
      const allowed = succeeds();
      if (allowed) {
        shifts.push(direction);
      }
      return allowed;
    },
  };
};

describe('tapping a direction', () => {
  it('shifts exactly one column', () => {
    const translator = new InputTranslator(TUNING);
    const { shifts, attempt } = recordShifts();

    translator.update(frame({ direction: -1 }), attempt);

    expect(shifts).toEqual([-1]);
  });

  it('does not repeat before the auto-shift delay elapses', () => {
    const translator = new InputTranslator(TUNING);
    const { shifts, attempt } = recordShifts();

    translator.update(frame({ direction: -1 }), attempt);
    for (let elapsed = 0; elapsed < TUNING.autoShiftDelay - FRAME; elapsed += FRAME) {
      translator.update(frame({ direction: -1 }), attempt);
    }

    expect(shifts).toEqual([-1]);
  });

  it('repeats once the auto-shift delay elapses', () => {
    const translator = new InputTranslator(TUNING);
    const { shifts, attempt } = recordShifts();

    translator.update(frame({ direction: -1 }), attempt);
    for (let elapsed = 0; elapsed <= TUNING.autoShiftDelay; elapsed += FRAME) {
      translator.update(frame({ direction: -1 }), attempt);
    }

    expect(shifts.length).toBeGreaterThan(1);
  });

  it('restarts the delay when the direction changes', () => {
    const translator = new InputTranslator(TUNING);
    const { shifts, attempt } = recordShifts();

    translator.update(frame({ direction: -1 }), attempt);
    translator.update(frame({ direction: 1 }), attempt);

    expect(shifts).toEqual([-1, 1]);
  });
});

describe('a shift blocked by a wall', () => {
  it('does not bank repeat time, so unblocking shifts once rather than bursting', () => {
    const translator = new InputTranslator(TUNING);
    let blocked = false;
    const { shifts, attempt } = recordShifts(() => !blocked);

    translator.update(frame({ direction: -1 }), attempt);

    blocked = true;
    for (let tick = 0; tick < 100; tick += 1) {
      translator.update(frame({ direction: -1 }), attempt);
    }

    blocked = false;
    shifts.length = 0;
    translator.update(frame({ direction: -1 }), attempt);

    expect(shifts).toEqual([-1]);
  });
});

describe('a zero auto-repeat interval', () => {
  it('slides until blocked within one frame instead of looping forever', () => {
    const translator = new InputTranslator({ autoShiftDelay: 0, autoRepeatInterval: 0 });
    let columnsLeft = 5;
    const { attempt } = recordShifts(() => columnsLeft-- > 0);

    translator.update(frame({ direction: 1 }), attempt);
    translator.update(frame({ direction: 1 }), attempt);

    expect(columnsLeft).toBeLessThanOrEqual(0);
  });
});

describe('soft drop', () => {
  it('is on while the key is held', () => {
    const translator = new InputTranslator(TUNING);
    expect(translator.update(frame({ softDropHeld: true }), () => true)).toBe(true);
  });

  it('stays off for a new piece that spawned while the key was already held', () => {
    const translator = new InputTranslator(TUNING);

    translator.update(frame({ softDropHeld: true }), () => true);
    const duringNewPiece = translator.update(
      frame({ softDropHeld: true, newPiece: true }),
      () => true,
    );

    expect(duringNewPiece).toBe(false);
  });

  it('resumes once the key is released and pressed again', () => {
    const translator = new InputTranslator(TUNING);

    translator.update(frame({ softDropHeld: true, newPiece: true }), () => true);
    translator.update(frame({ softDropHeld: false }), () => true);

    expect(translator.update(frame({ softDropHeld: true }), () => true)).toBe(true);
  });
});

describe('holding a direction across a lock', () => {
  it('does not move the new piece', () => {
    const translator = new InputTranslator(TUNING);
    const { shifts, attempt } = recordShifts();

    translator.update(frame({ direction: -1 }), attempt);
    shifts.length = 0;
    translator.update(frame({ direction: -1, newPiece: true }), attempt);

    expect(shifts).toEqual([]);
  });

  it('keeps the new piece still for as long as the key stays held', () => {
    const translator = new InputTranslator(TUNING);
    const { shifts, attempt } = recordShifts();

    translator.update(frame({ direction: -1, newPiece: true }), attempt);
    for (let tick = 0; tick < 50; tick += 1) {
      translator.update(frame({ direction: -1 }), attempt);
    }

    expect(shifts).toEqual([]);
  });

  it('moves again once the key is released and pressed again', () => {
    const translator = new InputTranslator(TUNING);
    const { shifts, attempt } = recordShifts();

    translator.update(frame({ direction: -1, newPiece: true }), attempt);
    translator.update(frame({ direction: null }), attempt);
    translator.update(frame({ direction: -1 }), attempt);

    expect(shifts).toEqual([-1]);
  });
});
