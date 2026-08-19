import { COLUMNS, FIRST_VISIBLE_ROW } from './grid';
import { Board } from './board';
import { FallingPair } from './falling-pair';
import { clearStep, findGroups, scoreLink } from './matching';
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

export class Simulation {
  readonly board = new Board();

  pair: FallingPair;

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

  chainLength = 0;

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
  upcoming: [number, number];

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
   */
  private fallProgress = 0;

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
    // Seed the preview before the first spawn consumes it.
    this.upcoming = this.nextPieceTypes();
    this.pair = this.spawn();
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
        this.pair.lock(this.board);

        // Peek before committing to a cascade: if the lock matched nothing, the
        // next pair spawns immediately. Otherwise every ordinary piece would
        // pay a chain-link delay it did not earn, and the game would stutter.
        if (findGroups(this.board).length > 0) {
          this.resolving = true;
          this.chainLength = 0;
          this.resolveTimer = 0;
          this.settlePending = false;
        } else {
          this.pair = this.spawn();
        }
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
   * Player input. Each returns whether the move actually happened.
   *
   * All three refuse while a cascade is resolving. That window is real: after a
   * lock, `pair` still points at the pair now sitting on the board, and the
   * next one has not spawned. Moving it then would write those tiles a second
   * time and corrupt the board.
   */
  moveLeft(): boolean {
    return this.resolving ? false : this.afterInput(this.pair.moveLeft(this.board));
  }

  moveRight(): boolean {
    return this.resolving ? false : this.afterInput(this.pair.moveRight(this.board));
  }

  rotate(): boolean {
    return this.resolving ? false : this.afterInput(this.pair.rotateClockwise(this.board));
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
      this.board.settle();
      this.settlePending = false;
      return;
    }

    const link = clearStep(this.board);
    if (link === null) {
      this.resolving = false;
      this.pair = this.spawn();
      return;
    }

    // `chainLength` is the 0-based index of this link, so the first link of a
    // cascade scores at 1x and each subsequent one doubles.
    this.score += scoreLink(link, this.chainLength);
    this.chainLength += 1;
    this.settlePending = true;
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
    const [pivotType, satelliteType] = this.upcoming;
    this.upcoming = this.nextPieceTypes();

    this.fallProgress = 0;
    this.lockTimer = 0;
    this.piecesSpawned += 1;

    // Orientation 0 puts the satellite directly above the pivot — in the hidden
    // row, so it is on the board but not drawn.
    return new FallingPair(SPAWN_COLUMN, SPAWN_ROW, 0, pivotType, satelliteType);
  }
}
