export type HorizontalDirection = -1 | 1;

export interface HeldKey {
  isDown: boolean;
  timeDown: number;
}

export function pressedDirection(left: HeldKey, right: HeldKey): HorizontalDirection | null {
  if (left.isDown && right.isDown) {
    return left.timeDown > right.timeDown ? -1 : 1;
  }
  if (left.isDown) {
    return -1;
  }
  if (right.isDown) {
    return 1;
  }
  return null;
}

interface InputTuning {
  autoShiftDelay: number;
  autoRepeatInterval: number;
}

export interface InputFrame {
  direction: HorizontalDirection | null;
  softDropHeld: boolean;
  newPiece: boolean;
  delta: number;
}

type ShiftAttempt = (direction: HorizontalDirection, fresh: boolean) => boolean;

export class InputTranslator {
  private heldDirection: HorizontalDirection | null = null;

  private autoRepeatTimer = 0;

  private softDropAwaitingRelease = false;

  private shiftAwaitingRelease = false;

  constructor(private tuning: InputTuning) {}

  update(frame: InputFrame, attemptShift: ShiftAttempt): boolean {
    if (frame.newPiece) {
      this.softDropAwaitingRelease = frame.softDropHeld;
      this.shiftAwaitingRelease = frame.direction !== null;
    }

    if (!frame.softDropHeld) {
      this.softDropAwaitingRelease = false;
    }

    this.updateShift(frame, attemptShift);

    return frame.softDropHeld && !this.softDropAwaitingRelease;
  }

  private updateShift(frame: InputFrame, attemptShift: ShiftAttempt): void {
    const { direction } = frame;

    if (direction === null) {
      this.heldDirection = null;
      this.shiftAwaitingRelease = false;
      return;
    }

    if (this.shiftAwaitingRelease) {
      return;
    }

    if (direction !== this.heldDirection) {
      this.heldDirection = direction;
      this.autoRepeatTimer = this.tuning.autoShiftDelay;
      attemptShift(direction, true);
      return;
    }

    this.autoRepeatTimer -= frame.delta;

    while (this.autoRepeatTimer <= 0) {
      if (!attemptShift(direction, false)) {
        this.autoRepeatTimer = 0;
        return;
      }
      this.autoRepeatTimer += this.tuning.autoRepeatInterval;
    }
  }
}
