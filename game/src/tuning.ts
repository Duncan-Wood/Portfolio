/**
 * Every "feel" dial in the game. Pure data with no imports, so the engine and
 * the scene can both depend on it.
 *
 * `Simulation` and `InputTranslator` re-read this object every frame, and dev
 * builds expose the scene's copy as `window.tuning`, so a value changed in the
 * console takes effect on the next frame.
 */
export interface Tuning {
  /** How long the player may go without connecting before a shadow takes a cell. */
  shadowInterval: number;

  /** Arrivals at one strength before the next comes a tier harder. */
  arrivalsPerShadowStrength: number;

  /**
   * A floor, before the reading time `readingPerCharacter` adds on top. A
   * question has no duration — it waits on the player pressing Enter.
   */
  fragmentDuration: number;

  readingPerCharacter: number;

  /** Milliseconds per row of normal gravity. Lower falls faster. */
  fallInterval: number;

  softDropInterval: number;

  /** Grace period before a landed pair commits. Resets on a successful move. */
  lockDelay: number;

  /**
   * DAS — how long a direction key is held before it starts repeating. Cannot go
   * below a natural tap duration (roughly 50-100ms), or a quick tap moves two
   * columns and precise placement becomes impossible.
   */
  autoShiftDelay: number;

  /** ARR — repeat interval after DAS. `0` means slide to the wall in one frame. */
  autoRepeatInterval: number;

  /** How long a completed group is held on screen before it pops. */
  chainLinkDelay: number;

  /** How long the hole a pop leaves stays open before tiles drop in. */
  settleDelay: number;

  /**
   * The animations over those two beats. Keep each under its beat, or the motion
   * is still running when the next beat starts.
   */
  popDuration: number;

  fallDuration: number;

  /** How long the simulation freezes on a clear while the scene keeps drawing. */
  hitStopDuration: number;

  landingBounceDuration: number;

  /**
   * Camera kick on a clear: shake as a fraction of the viewport, roll in
   * degrees, both scaled by chain length. The roll is what reads as force —
   * pure translation reads as a glitch.
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
