/**
 * Every "feel" dial in the game, in one place.
 *
 * Pure data with no imports, so both the engine and the Phaser scene can depend
 * on it without either depending on the other. `Simulation` and
 * `InputTranslator` are each handed this object and re-read it every frame, and
 * dev builds expose the scene's copy as `window.tuning` — so a value changed in
 * the console takes effect on the next frame, with no reload.
 */
export interface Tuning {
  /**
   * How long the player may go without connecting anything before a shadow
   * takes a cell. 
   */
  shadowInterval: number;

  /**
   * How many arrivals the shadow spends at one strength before the next comes
   * in a tier harder. A run that keeps connecting never advances it.
   */
  arrivalsPerShadowStrength: number;

  /**
   * How long a fragment holds the board, before the reading time that
   * `readingPerCharacter` adds on top. A question has no duration — it waits on
   * the player pressing Enter.
   */
  fragmentDuration: number;

  /** Reading time added per character of the line being held. */
  readingPerCharacter: number;

  /** Milliseconds per row of normal gravity. Lower falls faster. */
  fallInterval: number;

  /** Milliseconds per row while the player holds Down. */
  softDropInterval: number;

  /**
   * Grace period between a pair landing and being committed to the board.
   * Resets on a successful move or rotate.
   */
  lockDelay: number;

  /**
   * DAS — Delayed Auto Shift. How long a direction key must be held before it
   * starts repeating; one press moves exactly one column.
   *
   * It cannot go below a natural tap duration (roughly 50-100ms), or a quick tap
   * starts moving two columns and precise placement becomes impossible.
   */
  autoShiftDelay: number;

  /**
   * ARR — Auto Repeat Rate. Milliseconds between repeats once DAS has elapsed.
   * `0` is legal and means "slide until you hit something, within one frame".
   */
  autoRepeatInterval: number;

  /** Milliseconds a completed group stays on screen before it pops. */
  chainLinkDelay: number;

  /** Milliseconds the hole left by a pop stays open before tiles drop into it. */
  settleDelay: number;

  /**
   * How long a cleared tile takes to shrink away, and a settled tile to fall
   * into its hole. Both are drawn over a board the engine has already updated,
   * so neither changes any rule.
   *
   * Keep each under its beat (`chainLinkDelay`, `settleDelay`) or the motion is
   * still running when the next beat starts.
   */
  popDuration: number;

  fallDuration: number;

  /**
   * How long the simulation freezes when a group clears while the scene keeps
   * drawing, so the moment of impact is held rather than passed through.
   */
  hitStopDuration: number;

  /** How long a landed pair squashes for. */
  landingBounceDuration: number;

  /**
   * Camera kick on a clear: shake as a fraction of the viewport, roll in
   * degrees. Both scale with the chain's length. The roll is the half that
   * reads as force — pure translation reads as a glitch.
   */
  shakeIntensity: number;

  shakeRollDegrees: number;
}

export const DEFAULT_TUNING: Tuning = {
  shadowInterval: 6000,
  arrivalsPerShadowStrength: 4,
  fragmentDuration: 1400,
  readingPerCharacter: 48,
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
