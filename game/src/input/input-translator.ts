/*
 * Raw key state in, game actions out, with every rule about how holding a key
 * behaves.
 *
 * Phaser-free on purpose: everything here is game FEEL, and feel that lives
 * inside a Scene can only be checked by playing rather than by a test.
 */

export type HorizontalDirection = -1 | 1;

/** Structurally a subset of `Tuning`. */
interface InputTuning {
  autoShiftDelay: number;
  autoRepeatInterval: number;
}

export interface InputFrame {
  /** The scene resolves ties when both directions are held. */
  direction: HorizontalDirection | null;
  softDropHeld: boolean;
  /** True on the first frame after a new pair spawned. */
  newPiece: boolean;
  delta: number;
}

/** Returns false if the move was blocked, so the translator stops at a wall. */
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

  /**
   * The same latch for shifting. If it ever reads as a dead key rather than as
   * safety, drop it and let the held key re-trigger as a fresh press.
   */
  private shiftAwaitingRelease = false;

  /** Read at the moment needed: destructuring would kill live tuning. */
  constructor(private tuning: InputTuning) {}

  /** Returns whether soft drop should be active. */
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
      // Clear the latch so the next press counts as fresh.
      this.heldDirection = null;
      this.shiftAwaitingRelease = false;
      return;
    }

    if (this.shiftAwaitingRelease) {
      return;
    }

    if (direction !== this.heldDirection) {
      // Move immediately, then start the delay: that is what makes a tap
      // feel instant.
      this.heldDirection = direction;
      this.autoRepeatTimer = this.tuning.autoShiftDelay;
      attemptShift(direction);
      return;
    }

    this.autoRepeatTimer -= frame.delta;

    // A loop, so a long frame or a tiny interval still produces the right
    // number of repeats. An interval of 0 never raises the timer, so this exits
    // only when `attemptShift` fails.
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
