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
   * How long the player may go without connecting anything before the shadow
   * takes a cell.
   *
   * The antagonist is the one who stops without finishing, so what feeds it is
   * HESITATION rather than time. Gravity is not the pressure in this game;
   * dithering is. Every clear resets it, which makes the counter-play the same
   * verb the whole game is about.
   *
   * 6 seconds, played rather than reasoned about. It shipped at a guessed 12,
   * and at 12 the shadow was something you noticed afterwards rather than
   * something you played around; 20 was dead air. This is the dial that decides
   * whether the game is tense or nagging, so it is the one most worth replaying
   * whenever the rest of the pacing moves.
   *
   * It went to 12 while gravity was cut, because six seconds with no clock is
   * most of a single thinking turn and the shadow arrived while the player was
   * doing exactly what the game asked. Gravity is back, so this is back with
   * it.
   */
  shadowInterval: number;

  /**
   * How many arrivals the shadow spends at one strength before the next one
   * comes in a tier harder.
   *
   * Strength is how many hits a shadow takes, and a link's damage is its
   * depth, so this dial is really "how long before a single clear stops being
   * enough". That is the difficulty curve, and it is deliberately shaped by
   * the antagonist rather than by a level counter: a run that keeps connecting
   * never advances it, because it never gets the arrivals.
   *
   * 4, so at the shipping interval the first weak tier lasts roughly 24
   * seconds of cumulative dithering. That is long enough to learn the rule on
   * something a single clear kills, which is the whole reason the first tier
   * is beatable without a chain.
   */
  arrivalsPerShadowStrength: number;

  /**
   * How long a fragment and a question hold the board BEFORE the time it takes
   * to read them, which `readingPerCharacter` adds on top.
   *
   * A floor plus a rate, not a flat hold. A flat 3400ms was set against
   * fragments of a dozen clipped words; the ones that shipped are my own
   * sentences and the longest is three times the length of the shortest, so one
   * number either rushed that one off the screen or left the short ones sitting
   * there. What a reader needs is a moment to notice the thing at all, and then
   * time proportional to how much of it there is.
   *
   * The question's floor is the longer of the two because it is the only line
   * in the game addressed to the player, and it should still be there for a
   * beat after it has been read.
   */
  fragmentDuration: number;

  questionDuration: number;

  /**
   * Reading time, per character of the line being held.
   *
   * 48ms is around 210 words a minute — deliberately under the ~250 an adult
   * reads prose at, because this is read once, in a game, by someone who was
   * thinking about the board a second ago and has to find the text first.
   */
  readingPerCharacter: number;

    /**
   * Milliseconds per row of normal gravity. Lower = faster falling.
   *
   * 800 meant a piece took nearly ten seconds to cross the board, which read as
   * sluggish even though every input dial was already correct. Puyo and Tetris
   * both assume nobody waits for gravity — Puyo Puyo Tetris literally treats
   * soft drop as held by default — so this is the pace of a player who is
   * thinking, not the pace they are forced to sit through.
   */
  /**
   * Whether a piece descends on its own.
   *
   * ON, and this flip-flopped once — record it here so it does not flip again
   * without somebody knowing it was tried.
   *
   * The argument for cutting it was good on paper: the game is an escape room
   * made of boards, each a stated objective you solve rather than a stack you
   * survive, and a piece falling while you read the board is a clock. Clocks
   * stop puzzles being thinkable. So it was cut.
   *
   * Played, it was worse. Without gravity nothing ever says "now" — the board
   * sits still, there is no forcing function, and "confusing on what to do
   * next" is what a player actually reports. The falling pace was not
   * incidental either; it was TUNED. 800ms a row read as sluggish and 400 was
   * the fix, against DAS and ARR values that were already authentic Puyo. That
   * is real feel work and cutting gravity threw all of it away for an argument.
   *
   * What the cut was really pointing at was legibility, not physics: with no
   * clock the player is looking rather than busy, and the board was not showing
   * them their options. The landing ghost is the fix for that, and it earns its
   * place with gravity on.
   *
   * Kept as a dial rather than deleted, because the no-gravity mode is a
   * coherent thing this engine can still do and `simulation.test.ts` has a
   * block pinning its rules.
   */
  gravityEnabled: boolean;

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
  shadowInterval: 6000,
  arrivalsPerShadowStrength: 4,
  fragmentDuration: 1400,
  questionDuration: 3000,
  readingPerCharacter: 48,
  gravityEnabled: true,
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
