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
 * reload, no rebuild:
 *
 *     tuning.autoShiftDelay = 100      // DAS
 *     tuning.autoRepeatInterval = 30   // ARR; 0 means slide to the wall
 *     tuning.fallInterval = 350
 *     tuning.chainLinkDelay = 700      // slow a cascade down to watch it
 *
 * Chrome pauses requestAnimationFrame for hidden tabs, so the window must be
 * visible and frontmost or every timing measurement is meaningless.
 */
export interface Tuning {
  /**
   * Cells cleared to close the progress track once, and how many pads it is
   * divided into.
   *
   * They belong together because the number that actually governs pacing is the
   * quotient — at 120 over 20 pads, a pad costs 6 cells, about three or four
   * pieces. Splitting them across two files meant editing one silently changed
   * the pacing AND falsified the arithmetic written beside the other, and it
   * broke live tuning in the direction that matters: setting
   * `window.tuning.cellsPerTrackLoop` tells you nothing about what a pad costs
   * unless the divisor is in the same object.
   *
   * Measured, not guessed; the run data behind 120 is in `docs/PROGRESS.md`
   * under "How much progress a memory costs". The value tried first was 300,
   * which put one loop at 176 pieces — ten minutes for a single payoff.
   *
   * When memories arrive this stops being one number: the thresholds escalate,
   * and the FIRST is deliberately tiny. Dr. Mario opens on four viruses, and
   * that miniature first goal is what teaches the game without a tutorial.
   */
  cellsPerTrackLoop: number;

  progressPads: number;

  /**
   * Milliseconds per row of normal gravity. Lower = faster falling.
   *
   * 800 meant a piece took nearly ten seconds to cross the board, which read as
   * sluggish even though every input dial was already correct. Puyo and Tetris
   * both assume nobody waits for gravity — Puyo Puyo Tetris literally treats
   * soft drop as held by default — so this is the pace of a player who is
   * thinking, not the pace they are forced to sit through.
   */
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

  /**
   * How long a cleared tile takes to shrink away, and how long a settled tile
   * takes to fall into its hole. Both are drawn by the scene on top of a board
   * the engine has already updated, so neither changes any rule — set them to
   * 1 and the game plays identically, it just reads as teleporting again.
   *
   * Keep each under its beat (`chainLinkDelay`, `settleDelay`) or the motion is
   * still running when the next beat starts, which is legible but muddier.
   */
  popDuration: number;

  fallDuration: number;

  /**
   * How long the whole game freezes when a group clears. Hit-stop: the frames
   * keep drawing but the simulation does not advance, so the moment of impact
   * gets held rather than passed through. 60-80ms is the range where it reads
   * as weight instead of as a dropped frame.
   */
  hitStopDuration: number;

  /** How long a landed pair squashes for. Puyo holds its bounce 16 frames. */
  landingBounceDuration: number;

  /**
   * Camera kick on a clear: shake as a fraction of the viewport, roll in
   * DEGREES.
   *
   * The roll is the half that matters. Pure translation reads as a glitch — a
   * screen that only slides looks broken — while a couple of tenths of a degree
   * reads as force. Both scale with the chain length, so a deep chain hits
   * harder than a stray match.
   */
  shakeIntensity: number;

  shakeRollDegrees: number;
}

/**
 * Starting values. Judged as "responsive, just pointless" during Stage 1 —
 * i.e. the input was right and what was missing was the game around it — so
 * DAS/ARR were never swept.
 */
export const DEFAULT_TUNING: Tuning = {
  cellsPerTrackLoop: 120,
  progressPads: 20,
  fallInterval: 400,
  softDropInterval: 50,
  lockDelay: 500,
  autoShiftDelay: 130,
  autoRepeatInterval: 40,
  chainLinkDelay: 220,
  settleDelay: 130,
  popDuration: 150,
  fallDuration: 120,
  hitStopDuration: 70,
  landingBounceDuration: 140,
  shakeIntensity: 0.004,
  shakeRollDegrees: 0.22,
};
