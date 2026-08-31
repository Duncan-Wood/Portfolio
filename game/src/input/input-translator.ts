/*
 * Turns raw key state into game actions, and owns every rule about how holding
 * a key behaves.
 *
 * This lives outside the Phaser scene on purpose. Everything here is game
 * FEEL — the difference between input that lands instantly and input that
 * fights you — and feel that lives inside a Scene can only be checked by
 * playing the game. Being Phaser-free means each rule below is a unit test that
 * runs in a millisecond instead of a manual playtest.
 *
 * The scene keeps only the parts that genuinely need Phaser: reading `cursors`,
 * edge-detecting rotation via `JustDown`, and breaking the tie when both
 * direction keys are held.
 */

export type HorizontalDirection = -1 | 1;

/** The two dials this module owns. Structurally a subset of `Tuning`. */
interface InputTuning {
  autoShiftDelay: number;
  autoRepeatInterval: number;
}

export interface InputFrame {
  /** Which way the player is pressing, or null. The scene resolves ties. */
  direction: HorizontalDirection | null;
  softDropHeld: boolean;
  /** True on the first frame after a new pair spawned. */
  newPiece: boolean;
  /** Milliseconds since the previous frame. */
  delta: number;
}

/**
 * Attempts a one-column move; returns false if it was blocked. The translator
 * needs the outcome, not just to fire and forget, so it can stop pushing
 * against a wall.
 */
type ShiftAttempt = (direction: HorizontalDirection) => boolean;

export class InputTranslator {
  private heldDirection: HorizontalDirection | null = null;

  private autoRepeatTimer = 0;

  /**
   * Latches. When a new pair spawns while a key is already down, that key is
   * suppressed until it is physically released and pressed again.
   *
   * Soft drop needs this because it is 16x gravity here: a pair spawning under
   * a held Down key would cross the whole board in about 600ms, consuming your
   * next piece before you could react. Tetris lets soft drop carry over, but
   * its soft drop is roughly 2x gravity, not 16x.
   */
  private softDropAwaitingRelease = false;

  /**
   * Tetris deliberately keeps DAS charged across a lock and good players rely on
   * it. If this reads as a dead key rather than as safety, the softer variant is
   * to drop this latch and let the still-held key re-trigger as a fresh press,
   * which recharges DAS instead of blocking it.
   */
  private shiftAwaitingRelease = false;

  /**
   * Holds the live tuning object by reference, and reads `this.tuning.x` at the
   * moment it is needed. Destructuring these into locals here would silently
   * kill live tuning for DAS and ARR.
   */
  constructor(private tuning: InputTuning) {}

  /**
   * Process one frame. Performs any shifts through `attemptShift` and returns
   * whether soft drop should be active.
   */
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
   * DAS / ARR. One press moves exactly one column; holding waits
   * `autoShiftDelay`, then repeats every `autoRepeatInterval`.
   */
  private updateShift(frame: InputFrame, attemptShift: ShiftAttempt): void {
    const { direction } = frame;

    if (direction === null) {
      // Nothing held: forget the direction, and clear the latch so the next
      // press counts as fresh.
      this.heldDirection = null;
      this.shiftAwaitingRelease = false;
      return;
    }

    if (this.shiftAwaitingRelease) {
      return;
    }

    if (direction !== this.heldDirection) {
      // A new press (or a change of direction): move immediately, then start
      // the delay. The immediate move is what makes a tap feel instant.
      this.heldDirection = direction;
      this.autoRepeatTimer = this.tuning.autoShiftDelay;
      attemptShift(direction);
      return;
    }

    this.autoRepeatTimer -= frame.delta;

    // A loop rather than an `if`, so a long frame or a very small
    // `autoRepeatInterval` still produces the right number of repeats.
    // `autoRepeatInterval` of 0 is legal and means "slide until blocked": the
    // timer never rises, so this exits only when `attemptShift` fails.
    while (this.autoRepeatTimer <= 0) {
      if (!attemptShift(direction)) {
        // Blocked, so stop and zero the timer. Letting it keep counting
        // negative would bank repeats, and the moment the way cleared the pair
        // would jump several columns at once.
        this.autoRepeatTimer = 0;
        return;
      }
      this.autoRepeatTimer += this.tuning.autoRepeatInterval;
    }
  }
}
