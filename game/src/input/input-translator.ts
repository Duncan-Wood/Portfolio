
export type HorizontalDirection = -1 | 1;

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

type ShiftAttempt = (direction: HorizontalDirection) => boolean;

export class InputTranslator {
  private heldDirection: HorizontalDirection | null = null;

  private autoRepeatTimer = 0;

  /**
   * A key already down when a new pair spawns is suppressed until it is released
   * and pressed again. Soft drop is many times gravity here, so a pair spawning
   * under a held Down key would cross the board before the player reacted.
   */
  private softDropAwaitingRelease = false;

  private shiftAwaitingRelease = false;

  /** Read at the moment needed: destructuring would kill live tuning. */
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

  /**
   * DAS / ARR: one press moves one column, holding waits `autoShiftDelay` then
   * repeats every `autoRepeatInterval`.
   */
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
      attemptShift(direction);
      return;
    }

    this.autoRepeatTimer -= frame.delta;

    while (this.autoRepeatTimer <= 0) {
      if (!attemptShift(direction)) {
        // Zeroed rather than left negative, which would bank repeats and jump
        // the pair several columns the moment the way cleared.
        this.autoRepeatTimer = 0;
        return;
      }
      this.autoRepeatTimer += this.tuning.autoRepeatInterval;
    }
  }
}
