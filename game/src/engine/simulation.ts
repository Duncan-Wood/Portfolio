import { COLUMNS, FIRST_VISIBLE_ROW } from './grid';
import { Board, type TileMove } from './board';
import { FallingPair, type PairCell } from './falling-pair';
import { clearStep, findGroups, scoreLink, type ChainLink } from './matching';
import { DEFAULT_TUNING, type Tuning } from '../tuning';

/*
 * The game's clock and state machine. It owns the board and the falling pair,
 * and drives everything that happens over time: gravity, the lock delay, and
 * the cascade.
 *
 * It has NO notion of frames, rendering, or keyboards. It is advanced by
 * `update(delta)` where delta is milliseconds, and the caller decides where
 * that time comes from. That is what lets the entire game be tested without a
 * browser: a test calls `update(800)` and asserts the pair moved one row.
 */

/**
 * The column a pair spawns in. `floor((6 - 1) / 2)` = 2, so on a 6-wide board
 * this is the left of the two middle columns — an even width has no single
 * centre column, and biasing left is arbitrary but consistent.
 */
export const SPAWN_COLUMN = Math.floor((COLUMNS - 1) / 2);

/**
 * The row the pivot spawns on: the topmost VISIBLE row, which puts the
 * satellite one row above it, in the hidden field.
 *
 * That is the whole point of the hidden row. Spawning the pivot at row 0 left
 * the satellite at row -1, off the board entirely, where `lock()` silently
 * discarded it. Now both halves are inside the board from the moment they
 * appear.
 */
export const SPAWN_ROW = FIRST_VISIBLE_ROW;

/**
 * Where new piece colours come from. Injected rather than called directly so
 * the engine contains no randomness: the scene passes a supplier backed by
 * `Math.random`, tests pass
 * a fixed or scripted sequence. Every engine test is therefore deterministic
 * without needing a seeded RNG.
 */
export type PieceTypeSupplier = () => [number, number];

/**
 * One beat of a cascade, tagged with which kind it was.
 *
 * A discriminated union rather than two independent fields, because the scene's
 * question is "what happened this beat?" and that has exactly one answer. It
 * used to be a `lastLink` and a `lastSettle` that the scene told apart by
 * checking which object had been reallocated — the same fragile identity
 * comparison that `piecesSpawned` exists to avoid, and one that would have
 * broken silently the day `settle` started returning a shared empty array for
 * the no-move case.
 *
 * `connections` rides along on a clear because the engine is the only thing
 * that knows what this link alone earned; the running total cannot be
 * differenced without the reader keeping its own copy of the previous value.
 * What the link cleared, and what it drove off the board, are on the `link`.
 */
export type CascadeBeat =
  | { kind: 'clear'; link: ChainLink; connections: number }
  | { kind: 'settle'; moves: readonly TileMove[] };

export class Simulation {
  readonly board = new Board();

  pair!: FallingPair;

  softDropping = false;

  /**
   * Monotonic count of pairs spawned, including the first.
   *
   * Exists so the scene can detect "a piece locked and a new one spawned"
   * by comparing counts. It previously compared `FallingPair` object identity,
   * which worked but was fragile: the engine never promised to allocate a fresh
   * pair per spawn, so a future change to pool or reuse the object would have
   * silently broken the detection with no failing test. The engine owns the
   * lock-to-spawn transition, so it owns the signal.
   */
  piecesSpawned = 0;

  score = 0;

  /**
   * True while a cascade is playing out. The scene uses it to hide the pair,
   * and input is refused while it is set.
   */
  resolving = false;

  /**
   * True once a pair had nowhere to spawn. The game is over: nothing advances
   * and input is refused, so the final board stays on screen instead of the
   * stack silently overwriting itself.
   */
  toppedOut = false;

  chainLength = 0;

  /**
   * Connections made this run: cells cleared, each weighted by how deep into a
   * cascade its link was.
   *
   * The weight is the whole point. Counting raw cells paid a four-link chain
   * exactly what four separate clears paid, so the cheapest way to fill the
   * meter was to clear greedily — and deliberately NOT clearing, to stack a
   * chain, is the entire skill of this genre. A meter that ignores it teaches
   * players to avoid the good part of the game.
   *
   * Linear in depth (x1, x2, x3...) rather than exponential like `score`. The
   * score can afford to be showy; this drives a meter the player is meant to
   * predict, and something that doubles every link lurches out of reach.
   *
   * This is what progression is measured in — see PROGRESS.md, "the score is
   * not the progression".
   */
  connectionsMade = 0;

  /**
   * What the most recent cascade beat did, and a counter that ticks once per
   * beat so the scene can notice a new one.
   *
   * The board is already in its post-beat state by the time a frame renders, so
   * the scene cannot see what popped or what fell by looking at it. Rather than
   * have the engine call into the scene, the engine leaves the last beat's
   * result here and the scene watches `beatsPlayed` — the same shape as
   * `piecesSpawned`, and it keeps the engine free of callbacks.
   */
  beatsPlayed = 0;

  lastBeat: CascadeBeat | null = null;

  /**
   * Pairs committed to the board, and where the halves of the last one came to
   * rest after settling.
   *
   * Separate from `piecesSpawned` because they are different events: a lock
   * that starts a cascade, and a lock that tops the board out, both commit a
   * pair without spawning another. Inferring "a pair landed" from the spawn
   * counter therefore misses exactly the landings that matter most.
   */
  piecesLocked = 0;

  lastLanded: readonly PairCell[] = [];

  /**
   * The colours of the NEXT pair, drawn one piece ahead so the scene can show a
   * preview. This is what makes chain-building plannable — a satellite spawns
   * off-screen at row -1, so without a preview the only way to learn its colour
   * was to rotate the piece.
   *
   * The preview does not move the satellite on screen; you simply learn its
   * colour a piece earlier, which is how Puyo does it. Puyo shows TWO pairs of
   * lookahead — going deeper is a change to this queue's depth.
   */
  upcoming!: [number, number];

  /**
   * Progress toward the next row, as a FRACTION of the current interval (0 to
   * 1), not as elapsed milliseconds.
   *
   * This distinction fixed a real bug. Banking milliseconds meant that pressing
   * soft drop mid-fall spent the bank at the new, much faster rate: 750ms
   * accumulated against an 800ms gravity step became 750/50 = 15 rows' worth of
   * fall in a single frame, bounded in practice only by the floor (a test
   * measured 11 rows), teleporting the pair to the bottom. Storing a
   * fraction means a rate change preserves HOW FAR you are toward the next row
   * rather than re-pricing banked time, so switching rates can never burst. It
   * also makes changing `fallInterval` live, mid-fall, safe.
   *
   * Public because the scene draws the pair at `row + fallProgress`, which is
   * what makes gravity look like falling rather than stepping.
   */
  fallProgress = 0;

  private resolveTimer = 0;

  /**
   * Whether the next cascade beat is a settle (tiles fall) rather than a clear.
   * The cascade alternates: clear, settle, clear, settle...
   */
  private settlePending = false;

  private lockTimer = 0;

  constructor(
    private nextPieceTypes: PieceTypeSupplier,
    /**
     * Timings are injected rather than imported as constants so the scene can
     * hand in a live object and mutate it at runtime (`window.tuning`), and so
     * tests are insulated from whatever the scene is doing. Every read is
     * `this.tuning.x` at the moment it is needed — never destructured into a
     * local at construction, or live tuning would silently stop working.
     */
    private tuning: Tuning = DEFAULT_TUNING,
  ) {
    // A new simulation and a restarted one are the same thing, so there is one
    // description of what a fresh game looks like rather than two that a
    // compiler will never reconcile. `pair` and `upcoming` carry definite
    // assignment assertions because TypeScript cannot see through the call.
    this.restart();
  }

  /**
   * Advance the game by `delta` milliseconds.
   *
   * There are three mutually exclusive states, checked in this order:
   *   1. resolving a cascade — nothing else happens
   *   2. the pair has landed  — count down the lock delay
   *   3. the pair is falling  — apply gravity
   *
   * The engine deliberately does NOT clamp `delta`; it trusts its caller. The
   * caller's job is to bound it, which `FixedTimestep` does.
   */
  update(delta: number): void {
    if (this.toppedOut) {
      return;
    }

    if (this.resolving) {
      this.advanceChain(delta);
      return;
    }

    if (!this.pair.canFall(this.board)) {
      // LOCK DELAY: a grace period between touching down and being committed.
      // Without it a landed piece freezes instantly and you can never slide it
      // into a gap at the last moment, which feels punishing.
      this.lockTimer += delta;

      if (this.lockTimer >= this.tuning.lockDelay) {
        this.lockPair();
      }
      return;
    }

    // Still falling, so any lock-delay progress is void — this is what lets a
    // player slide a piece sideways off a ledge and have it keep falling.
    this.lockTimer = 0;

    // Soft drop SWAPS the interval rather than multiplying it, so the drop
    // speed is one predictable number rather than a product of two dials.
    const interval = this.softDropping
      ? this.tuning.softDropInterval
      : this.tuning.fallInterval;

    this.fallProgress += delta / interval;

    // A loop, not an `if`, because one delta can span several rows when the
    // interval is short. Bounded in practice by the board height, since `fall`
    // returns false once the pair lands.
    while (this.fallProgress >= 1) {
      if (!this.pair.fall(this.board)) {
        // Blocked mid-loop. Discard the banked progress, otherwise it stays
        // above 1 and the pair would drop a row instantly the moment it can
        // move again — for instance after sliding sideways over a gap.
        this.fallProgress = 0;
        break;
      }
      this.fallProgress -= 1;
    }
  }

  /**
   * Start a new game on the same simulation, from any state.
   *
   * Works mid-run as well as after a top-out: a run you can already tell is
   * lost is a run you want to abandon, and needing to reach the top first would
   * make playtesting slower than the game.
   */
  restart(): void {
    this.board.reset();

    this.score = 0;
    this.connectionsMade = 0;
    this.chainLength = 0;
    this.resolving = false;
    this.settlePending = false;
    this.resolveTimer = 0;
    this.softDropping = false;
    this.toppedOut = false;

    this.beatsPlayed = 0;
    this.lastBeat = null;
    this.piecesLocked = 0;
    this.lastLanded = [];

    this.piecesSpawned = 0;
    // Seed the preview before the first spawn consumes it.
    this.upcoming = this.nextPieceTypes();
    this.pair = this.spawn();
  }

  /**
   * Player input. Each returns whether the move actually happened.
   *
   * All three refuse while a cascade resolves or after a top-out, for the same
   * reason: in both states `pair` still points at the pair now sitting on the
   * board, and no replacement has spawned. Moving it then would write those
   * tiles a second time and corrupt the board.
   */
  moveLeft(): boolean {
    return this.acceptsInput ? this.afterInput(this.pair.moveLeft(this.board)) : false;
  }

  moveRight(): boolean {
    return this.acceptsInput ? this.afterInput(this.pair.moveRight(this.board)) : false;
  }

  rotate(): boolean {
    return this.acceptsInput ? this.afterInput(this.pair.rotateClockwise(this.board)) : false;
  }

  /**
   * Slam the pair down and commit it immediately, skipping the lock delay.
   * Returns how far it fell, which the scene scales its screen shake by — a
   * drop from the top should land harder than a drop of one row.
   *
   * Deliberately not routed through `afterInput`: that resets the lock timer to
   * give the player more time, and this is the input that says the opposite.
   */
  hardDrop(): number {
    if (!this.acceptsInput) {
      return 0;
    }

    let distance = 0;
    while (this.pair.fall(this.board)) {
      distance += 1;
    }

    this.lockPair();
    return distance;
  }

  /**
   * One home for the refusal rule, so a fourth input method cannot be added
   * that honours only half of it.
   */
  private get acceptsInput(): boolean {
    return !this.resolving && !this.toppedOut;
  }

  /**
   * Play one beat of a cascade. Beats alternate between clearing and settling
   * so the player can see cause and effect as two separate moments:
   *
   *   clear  -> a group vanishes, leaving a hole with tiles hanging over it
   *   settle -> those tiles drop into the hole
   *   clear  -> whatever that landing completed vanishes in turn
   *   ...    -> until a clear finds nothing, and the next pair spawns
   *
   * The two beats have separate durations because they are doing different
   * jobs: `chainLinkDelay` holds a completed group on screen before it pops,
   * and `settleDelay` holds the resulting hole open before tiles drop in.
   */
  private advanceChain(delta: number): void {
    const beat = this.settlePending ? this.tuning.settleDelay : this.tuning.chainLinkDelay;

    this.resolveTimer += delta;
    if (this.resolveTimer < beat) {
      return;
    }
    this.resolveTimer = 0;

    if (this.settlePending) {
      this.settlePending = false;
      this.recordBeat({ kind: 'settle', moves: this.board.settle() });
      return;
    }

    const link = clearStep(this.board);
    if (link === null) {
      // Not a beat: the cascade is simply over, and nothing moved to show.
      this.resolving = false;
      this.spawnOrTopOut();
      return;
    }

    // `chainLength` is the 0-based index of this link, so the first link of a
    // cascade scores at 1x and each subsequent one doubles.
    const connections = link.cellsCleared * (this.chainLength + 1);

    this.score += scoreLink(link, this.chainLength);
    this.connectionsMade += connections;
    this.chainLength += 1;
    this.settlePending = true;
    this.recordBeat({ kind: 'clear', link, connections });
  }

  private recordBeat(beat: CascadeBeat): void {
    this.lastBeat = beat;
    this.beatsPlayed += 1;
  }

  /**
   * Commit the pair to the board and decide what happens next.
   *
   * Peek before committing to a cascade: if the lock matched nothing, the next
   * pair spawns immediately. Otherwise every ordinary piece would pay a
   * chain-link delay it did not earn, and the game would stutter.
   *
   * Shared by the lock delay and by `hardDrop`, which is the whole reason it is
   * a method — two callers deciding separately what a lock means is how the two
   * paths drift apart.
   */
  private lockPair(): void {
    this.lastLanded = this.pair.lock(this.board);
    this.piecesLocked += 1;

    if (findGroups(this.board).length > 0) {
      this.resolving = true;
      this.chainLength = 0;
      this.resolveTimer = 0;
      this.settlePending = false;
      return;
    }

    this.spawnOrTopOut();
  }

  /**
   * Spawn the next pair, or declare the game over if it has nowhere to go.
   *
   * The candidate is built and asked whether it fits, rather than testing the
   * spawn cells by hand: `FallingPair` already owns where a satellite sits at
   * each orientation, and a second copy of that geometry here would quietly
   * check the wrong cells if the spawn shape or `HIDDEN_ROWS` ever changed.
   *
   * Asking before committing is what keeps `place` able to throw on an occupied
   * cell — a pair spawning into occupied cells is the one path that would
   * otherwise destroy tiles the player built with.
   */
  private spawnOrTopOut(): void {
    if (!this.nextPair().fitsOn(this.board)) {
      this.toppedOut = true;
      return;
    }

    this.pair = this.spawn();
  }

  /**
   * LOCK DELAY RESET. A successful move or rotate restarts the countdown; a
   * blocked one does not.
   *
   * That asymmetry is deliberate — if blocked moves also reset it, you could
   * stall forever by mashing into a wall. There is deliberately NO cap on how
   * many times a successful move may reset it: that is Puyo behaviour, where
   * Tetris uses a move-reset limit. Revisit when tuning feel.
   */
  private afterInput(moved: boolean): boolean {
    if (moved) {
      this.lockTimer = 0;
    }
    return moved;
  }

  /**
   * Take the previewed pair, draw a replacement preview, and reset the per-piece
   * timers.
   *
   * Resetting `fallProgress` here is what stops soft-drop progress leaking
   * across a lock into the next piece.
   */
  private spawn(): FallingPair {
    const next = this.nextPair();
    this.upcoming = this.nextPieceTypes();

    this.fallProgress = 0;
    this.lockTimer = 0;
    this.piecesSpawned += 1;

    return next;
  }

  /**
   * The pair the preview is promising, positioned where it would spawn. Built
   * without side effects, so `spawnOrTopOut` can ask whether it fits before
   * anything commits to it.
   *
   * Orientation 0 puts the satellite directly above the pivot — in the hidden
   * row, so it is on the board but not drawn.
   */
  private nextPair(): FallingPair {
    const [pivotType, satelliteType] = this.upcoming;
    return new FallingPair(SPAWN_COLUMN, SPAWN_ROW, 0, pivotType, satelliteType);
  }
}
