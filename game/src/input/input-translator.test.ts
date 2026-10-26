import { describe, expect, it } from 'vitest';
import {
  type HorizontalDirection,
  type InputFrame,
  InputTranslator,
  pressedDirection,
} from './input-translator';

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

describe('telling a fresh press from a held one', () => {
  it('marks the first shift of a press as fresh and every repeat as not', () => {
    const translator = new InputTranslator(TUNING);
    const fresh: boolean[] = [];

    for (let elapsed = 0; elapsed <= TUNING.autoShiftDelay + TUNING.autoRepeatInterval * 3; elapsed += FRAME) {
      translator.update(frame({ direction: -1 }), (_, isFresh) => {
        fresh.push(isFresh);
        return true;
      });
    }

    expect(fresh[0]).toBe(true);
    expect(fresh.length).toBeGreaterThan(2);
    expect(fresh.slice(1).every((isFresh) => !isFresh)).toBe(true);
  });

  it('counts turning back the other way as a fresh press', () => {
    const translator = new InputTranslator(TUNING);
    const fresh: boolean[] = [];
    const attempt = (_: HorizontalDirection, isFresh: boolean) => {
      fresh.push(isFresh);
      return true;
    };

    translator.update(frame({ direction: -1 }), attempt);
    translator.update(frame({ direction: 1 }), attempt);

    expect(fresh).toEqual([true, true]);
  });
});

describe('choosing a direction from the left and right keys', () => {
  const up = { isDown: false, timeDown: 0 };
  const heldSince = (timeDown: number) => ({ isDown: true, timeDown });

  it('goes nowhere when neither key is held', () => {
    expect(pressedDirection(up, up)).toBeNull();
  });

  it('goes left when only left is held', () => {
    expect(pressedDirection(heldSince(100), up)).toBe(-1);
  });

  it('goes right when only right is held', () => {
    expect(pressedDirection(up, heldSince(100))).toBe(1);
  });

  it('follows the key pressed last when both are held, so a roll from one to the other turns around', () => {
    expect(pressedDirection(heldSince(100), heldSince(250))).toBe(1);
    expect(pressedDirection(heldSince(250), heldSince(100))).toBe(-1);
  });

  it('goes right when both were pressed at the very same moment', () => {
    expect(pressedDirection(heldSince(100), heldSince(100))).toBe(1);
  });

  it('ignores how long a released key was last held', () => {
    expect(pressedDirection({ isDown: false, timeDown: 900 }, heldSince(100))).toBe(1);
  });
});
