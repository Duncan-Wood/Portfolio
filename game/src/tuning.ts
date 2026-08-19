/**
 * Every "feel" dial in the game, in one place.
 *
 * Pure data with no imports, so both the engine and the Phaser scene can depend
 * on it without either depending on the other.
 *
 * These numbers are the difference between a game that feels responsive and one
 * that feels sluggish or twitchy, and they can only be settled by playing. So
 * they are not constants scattered through the code: `Simulation` and
 * `InputTranslator` are each handed this object and re-read it every frame,
 * and in dev builds the scene exposes its copy as `window.tuning`. Changing a
 * value in the browser console takes effect on the very next frame — no
 * reload, no rebuild.
 */
export interface Tuning {
  /** Milliseconds per row of normal gravity. Lower = faster falling. */
  fallInterval: number;

  /**
   * Milliseconds per row while the player holds Down. At 50 against an 800
   * `fallInterval` this is 16x gravity, which is aggressive — Tetris soft drop
   * is nearer 2x.
   */
  softDropInterval: number;

  /**
   * Grace period, in milliseconds, between a pair landing and being committed
   * to the board. Resets on a successful move or rotate, so you can still slide
   * a piece into a gap after it has touched down.
   */
  lockDelay: number;

  /**
   * DAS — Delayed Auto Shift. How long a direction key must be held before it
   * starts repeating. The same idea as your keyboard's "delay until repeat":
   * one press moves exactly one column, and only a sustained hold slides.
   *
   * This is the dial that matters most here. On a 6-wide board you spawn in
   * column 2, so you are never more than three columns from a wall — auto-repeat
   * only gets to fire once or twice before you arrive, which is why a value
   * borrowed from 10-wide Tetris can make holding feel like tapping.
   *
   * It cannot go below your natural tap duration (roughly 50-100ms) or a quick
   * tap starts moving two columns and precise placement becomes impossible.
   */
  autoShiftDelay: number;

  /**
   * ARR — Auto Repeat Rate. Milliseconds between repeats once DAS has elapsed.
   * `0` is legal and means "slide until you hit something, within one frame".
   */
  autoRepeatInterval: number;

  /**
   * Milliseconds a completed group stays on screen BEFORE it pops. The pause
   * that lets you see what you just made.
   */
  chainLinkDelay: number;

  /**
   * Milliseconds the hole left by a pop stays open BEFORE tiles drop into it.
   * The drop itself is instantaneous — nothing is tweened yet.
   */
  settleDelay: number;
}

/**
 * Starting values. Judged as "responsive, just pointless" during Stage 1 —
 * i.e. the input was right and what was missing was the game around it — so
 * DAS/ARR were never swept.
 */
export const DEFAULT_TUNING: Tuning = {
  fallInterval: 800,
  softDropInterval: 50,
  lockDelay: 500,
  autoShiftDelay: 130,
  autoRepeatInterval: 40,
  chainLinkDelay: 220,
  settleDelay: 130,
};
