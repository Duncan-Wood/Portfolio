import {
  COLUMNS,
  FIRST_VISIBLE_ROW,
  MAX_SHADOW_STRENGTH,
  ROWS,
  isColour,
  isShadow,
  shadowCell,
  shadowHolding,
} from './grid';
import { Board, type TileMove } from './board';
import { FallingPair, type PairCell } from './falling-pair';
import {
  clearStep,
  findGroups,
  scoreLink,
  type ChainLink,
  type GroupCell,
  type ShadowHit,
} from './matching';
import { DEFAULT_TUNING, type Tuning } from '../tuning';

/*
 * The game's clock and state machine: gravity, the lock delay, the cascade, and
 * the shadow's patience. What drives the shadow OFF belongs to `matching.ts`,
 * because that is what clearing does.
 *
 * No notion of frames, rendering or keyboards — advanced by `update(delta)` in
 * milliseconds, which is what lets the game be tested without a browser.
 */

/** The left of the two middle columns: an even width has no single centre. */
export const SPAWN_COLUMN = Math.floor((COLUMNS - 1) / 2);

/**
 * The topmost VISIBLE row, putting the satellite in the hidden field above it,
 * so both halves are inside the board from the moment they appear.
 */
export const SPAWN_ROW = FIRST_VISIBLE_ROW;

/**
 * Injected so the engine contains no randomness: tests pass a scripted sequence
 * and stay deterministic without a seeded RNG.
 */
type PieceTypeSupplier = () => [number, number];

/**
 * One beat of a cascade. `connections` rides along on a clear because the engine
 * is the only thing that knows what this link ALONE earned — the running total
 * cannot be differenced without the reader keeping its own previous value.
 */
export type CascadeBeat =
  | { kind: 'clear'; link: ChainLink; connections: number }
  | { kind: 'settle'; moves: readonly TileMove[] };

export class Simulation {
  readonly board = new Board();

  pair!: FallingPair;

  softDropping = false;

  /**
   * Compared rather than `FallingPair` identity: the engine promises the number
   * ticks, never that the object is reallocated.
   */
  piecesSpawned = 0;

  score = 0;

  /** The scene hides the pair while this is set, and input is refused. */
  resolving = false;

  /**
   * A pair had nowhere to spawn. Nothing advances and input is refused, so the
   * final board stays on screen rather than overwriting itself.
   */
  toppedOut = false;

  /**
   * How many pieces this board gives you, or `0` for no limit.
   *
   * A COUNT, not a timer: a timer punishes thinking, where a count prices
   * thinking at nothing and prices ACTION instead. That is what makes one
   * cascade reaching two neurons worth more than two clears reaching the same.
   */
  pieceBudget = 0;

  chainLength = 0;

  /**
   * The counter is what the scene watches for an arrival to react to. Only a
   * landed arrival counts, so the scene never animates a creature into a cell it
   * never reached.
   */
  shadowTaken = 0;

  lastShadowCell: GroupCell | null = null;

  /**
   * COUNTED from the board rather than tracked alongside it: a running tally
   * disagrees the moment anything puts shadow on the board by another route.
   */
  get shadowOnBoard(): number {
    let held = 0;

    for (let row = 0; row < ROWS; row += 1) {
      for (let column = 0; column < COLUMNS; column += 1) {
        if (isShadow(this.board.pieceAt(column, row))) {
          held += 1;
        }
      }
    }

    return held;
  }

  /**
   * Since anything last CLEARED, not since the last input: a player can shuffle
   * a piece back and forth all day and still be stalling.
   */
  private stallTimer = 0;

  /**
   * Cells cleared, weighted by link depth. This, not `score`, is what
   * progression is measured in.
   *
   * The weight is the point: raw cells would pay a four-link chain what four
   * separate clears pay, making greedy clearing the cheapest way to fill the
   * meter — and NOT clearing, to stack a chain, is the skill of the genre.
   *
   * Linear in depth rather than exponential like `score`, so the meter is
   * predictable rather than lurching.
   */
  connectionsMade = 0;

  /**
   * The board is in its post-beat state by the time a frame renders, so the
   * scene cannot see what popped by looking. The engine leaves the result here
   * rather than calling into the scene, which keeps it free of callbacks.
   */
  beatsPlayed = 0;

  lastBeat: CascadeBeat | null = null;

  /**
   * Separate from `piecesSpawned`: a lock that starts a cascade and one that
   * tops the board out both commit a pair without spawning another, so a landing
   * inferred from the spawn counter misses the ones that matter most.
   */
  piecesLocked = 0;

  lastLanded: readonly PairCell[] = [];

  /**
   * Drawn one piece ahead so the scene can preview it. The satellite spawns in
   * the hidden row, so without this the only way to learn its colour is to
   * rotate the piece — which is what makes chain-building plannable.
   */
  upcoming!: [number, number];

  /**
   * A FRACTION of the current interval, never elapsed milliseconds. Banking
   * milliseconds lets a rate change re-price the bank: time accumulated against
   * a slow gravity step, spent at the soft-drop rate, is several rows of fall in
   * one frame. A fraction cannot burst, so `fallInterval` is safe to change
   * mid-fall.
   *
   * Public because the scene draws the pair at `row + fallProgress`.
   */
  fallProgress = 0;

  private resolveTimer = 0;

  /** The cascade alternates: clear, settle, clear, settle... */
  private settlePending = false;

  private lockTimer = 0;

  constructor(
    private nextPieceTypes: PieceTypeSupplier,
    /**
     * Read as `this.tuning.x` at the moment needed, never destructured into a
     * local, or live tuning stops working.
     */
    private tuning: Tuning = DEFAULT_TUNING,
  ) {
    // `pair` and `upcoming` carry definite assignment assertions because
    // TypeScript cannot see through this call.
    this.restart();
  }

  /**
   * Three mutually exclusive states, in this order:
   *   1. resolving a cascade — nothing else happens
   *   2. the pair has landed  — count down the lock delay
   *   3. the pair is falling  — apply gravity
   *
   * The shadow's patience runs alongside 2 and 3, never during 1: time spent
   * watching a cascade is not time spent hesitating.
   *
   * Does NOT clamp `delta`. Bounding it is the caller's job — `FixedTimestep`.
   */
  update(delta: number): void {
    if (this.toppedOut) {
      return;
    }

    if (this.resolving) {
      this.advanceChain(delta);
      return;
    }

    // The cascade from the last piece still plays out above, but nothing may
    // accrue on a board the player cannot act on: a shadow arriving after the
    // last piece punishes a decision nobody was allowed to make.
    if (this.outOfPieces) {
      return;
    }

    this.stallTimer += delta;
    if (this.stallTimer >= this.tuning.shadowInterval) {
      this.stallTimer = 0;
      this.encroach();
    }

    if (!this.pair.canFall(this.board)) {
      // A grace period so a landed piece can still be slid into a gap.
      this.lockTimer += delta;

      if (this.lockTimer >= this.tuning.lockDelay) {
        this.lockPair();
      }
      return;
    }

    // Lock-delay progress is void while falling, which is what lets a piece be
    // slid sideways off a ledge and keep falling.
    this.lockTimer = 0;

    // Soft drop SWAPS the interval rather than multiplying it, so drop speed is
    // one number rather than a product of two dials.
    const interval = this.softDropping
      ? this.tuning.softDropInterval
      : this.tuning.fallInterval;

    this.fallProgress += delta / interval;

    // A loop, because one delta can span several rows when the interval is
    // short. Bounded by the board height, since `fall` fails once it lands.
    while (this.fallProgress >= 1) {
      if (!this.pair.fall(this.board)) {
        // Discard the banked progress, or the pair drops a row instantly the
        // moment it can move again — after sliding sideways over a gap, say.
        this.fallProgress = 0;
        break;
      }
      this.fallProgress -= 1;
    }
  }

  /**
   * Works mid-run as well as after a top-out: a run you can already tell is lost
   * is one you want to abandon.
   */
  restart(): void {
    this.board.reset();

    this.score = 0;
    this.connectionsMade = 0;
    this.chainLength = 0;
    this.stallTimer = 0;
    this.resolving = false;
    this.settlePending = false;
    this.resolveTimer = 0;
    this.softDropping = false;
    this.toppedOut = false;

    this.beatsPlayed = 0;
    this.lastBeat = null;
    this.piecesLocked = 0;
    this.lastLanded = [];
    this.shadowTaken = 0;
    this.lastShadowCell = null;

    this.piecesSpawned = 0;
    // Before the first spawn consumes it.
    this.upcoming = this.nextPieceTypes();
    this.pair = this.spawn();
  }

  /**
   * Each returns whether the move actually happened.
   *
   * All three refuse while a cascade resolves or after a top-out: in both states
   * `pair` still points at tiles now sitting on the board, so moving it would
   * write them a second time.
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
   * Returns how far it fell, which the scene scales its shake by. Deliberately
   * not routed through `afterInput`: that resets the lock timer to give the
   * player more time, and this is the input that says the opposite.
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

  /** `Infinity` when unbudgeted, and floored at zero because it is drawn. */
  get piecesRemaining(): number {
    return this.pieceBudget === 0
      ? Infinity
      : Math.max(this.pieceBudget - this.piecesLocked, 0);
  }

  /**
   * Input is refused from here as after a top-out, so the final board stays on
   * screen. What happens next is the run structure's business, not this file's.
   */
  get outOfPieces(): boolean {
    return this.pieceBudget !== 0 && this.piecesLocked >= this.pieceBudget;
  }

  /** One home for the refusal rule, so a new input cannot honour half of it. */
  private get acceptsInput(): boolean {
    return !this.resolving && !this.toppedOut && !this.outOfPieces;
  }

  /**
   * Beats alternate so cause and effect are two separate moments:
   *
   *   clear  -> a group vanishes, leaving a hole with tiles hanging over it
   *   settle -> those tiles drop into the hole
   *   clear  -> whatever that landing completed vanishes in turn
   *   ...    -> until a clear finds nothing, and the next pair spawns
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

    // The same 0-based index that doubles the score is what decides whether the
    // clear kills what it touches or only dents it.
    const link = clearStep(this.board, this.chainLength);
    if (link === null) {
      // Not a beat: the cascade is over and nothing moved to show.
      this.resolving = false;
      this.spawnOrTopOut();
      return;
    }

    this.stallTimer = 0;

    const connections = link.cellsCleared * (this.chainLength + 1);

    this.score += scoreLink(link, this.chainLength);
    this.connectionsMade += connections;
    this.chainLength += 1;
    this.settlePending = true;
    this.recordBeat({ kind: 'clear', link, connections });
  }

  /**
   * Drive every shadow off the board at once.
   *
   * WHAT was typed never reaches here and must not: the engine is told THAT an
   * answer happened, never what it said.
   *
   * Returns the cells deepest first, so the scene can play the wave rising out
   * of the stack — the board is empty by the time anything renders.
   */
  answerQuestion(): { driven: readonly ShadowHit[]; settled: readonly TileMove[] } {
    const driven: ShadowHit[] = [];

    for (let row = ROWS - 1; row >= 0; row -= 1) {
      for (let column = 0; column < COLUMNS; column += 1) {
        const cell = this.board.pieceAt(column, row);
        if (isShadow(cell)) {
          this.board.clear(column, row);
          // Answering ignores the tier — the one thing in the game that does.
          driven.push({ column, row, strength: 1, turnedTo: shadowHolding(cell) });
        }
      }
    }

    // Emptying cells mid-stack means the tiles on them have to come down. The
    // moves are handed back because the board is settled before anything renders.
    return { driven, settled: this.board.settle() };
  }

  /**
   * The tile the shadow would take if it arrived right now, or `null`. Public so
   * the scene can point at it BEFORE it happens: a threat you cannot see coming
   * is an interruption rather than pressure. Pure.
   */
  get threatenedCell(): GroupCell | null {
    let chosenColumn = -1;
    let chosenRow = -1;
    let fewest = Number.POSITIVE_INFINITY;

    for (let column = 0; column < COLUMNS; column += 1) {
      let tiles = 0;
      let topmost = -1;

      for (let row = FIRST_VISIBLE_ROW; row < ROWS; row += 1) {
        // A cell the shadow already holds is not a foothold it can take twice.
        if (isColour(this.board.pieceAt(column, row))) {
          tiles += 1;
          if (topmost === -1) {
            topmost = row;
          }
        }
      }

      if (topmost !== -1 && tiles < fewest) {
        fewest = tiles;
        chosenColumn = column;
        chosenRow = topmost;
      }
    }

    return chosenColumn === -1 ? null : { column: chosenColumn, row: chosenRow };
  }

  /** Fills while nothing connects, and drops the moment something does. */
  get stallProgress(): number {
    return Math.min(this.stallTimer / this.tuning.shadowInterval, 1);
  }

  /**
   * Take the topmost tile of the emptiest column that has one.
   *
   * It POSSESSES a tile rather than filling an empty cell, so the threat is not
   * "you will run out of room" but "the board you built stops working".
   *
   * The emptiest column, because spreading it costs reach everywhere rather than
   * ending the run in one place; the topmost tile, because one buried under six
   * others was not about to be used.
   *
   * No column is off limits, the falling pair's included: possession only takes
   * an occupied cell and the pair only locks into empty ones. If there is
   * nothing to take, nothing happens — topping out is `spawnOrTopOut`'s job.
   */
  private encroach(): void {
    const target = this.threatenedCell;
    if (target === null) {
      return;
    }

    const { column: chosenColumn, row: chosenRow } = target;

    // The first few are freed by an ordinary clear and the late ones are not.
    // `shadowTaken` is still 0 here, which makes the opening tier the weakest.
    const strength = Math.min(
      1 + Math.floor(this.shadowTaken / this.tuning.arrivalsPerShadowStrength),
      MAX_SHADOW_STRENGTH,
    );

    const taken = this.board.pieceAt(chosenColumn, chosenRow) as number;
    this.board.clear(chosenColumn, chosenRow);
    this.board.place(chosenColumn, chosenRow, shadowCell(strength, taken));

    this.lastShadowCell = { column: chosenColumn, row: chosenRow };
    this.shadowTaken += 1;
  }

  private recordBeat(beat: CascadeBeat): void {
    this.lastBeat = beat;
    this.beatsPlayed += 1;
  }

  /**
   * Peek before committing to a cascade: if the lock matched nothing the next
   * pair spawns immediately, or every ordinary piece pays a chain-link delay it
   * did not earn. Shared by the lock delay and `hardDrop`, so they cannot drift.
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
   * The candidate is built and asked whether it fits rather than testing the
   * spawn cells by hand: `FallingPair` owns where a satellite sits at each
   * orientation, and a second copy of that geometry would check the wrong cells
   * if the spawn shape or `HIDDEN_ROWS` changed.
   *
   * Asking first is what keeps `place` able to throw on an occupied cell.
   */
  private spawnOrTopOut(): void {
    if (!this.nextPair().fitsOn(this.board)) {
      this.toppedOut = true;
      return;
    }

    this.pair = this.spawn();
  }

  /**
   * A successful move restarts the countdown; a blocked one does not, or a
   * player could stall forever against a wall. No cap on how many times, which
   * is worth revisiting if a piece ever feels un-committable.
   */
  private afterInput(moved: boolean): boolean {
    if (moved) {
      this.lockTimer = 0;
    }
    return moved;
  }

  /**
   * Resetting `fallProgress` is what stops soft-drop progress leaking across a
   * lock into the next piece.
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
   * Built without side effects, so `spawnOrTopOut` can ask whether it fits first.
   * Orientation 0 puts the satellite in the hidden row above the pivot.
   */
  private nextPair(): FallingPair {
    const [pivotType, satelliteType] = this.upcoming;
    return new FallingPair(SPAWN_COLUMN, SPAWN_ROW, 0, pivotType, satelliteType);
  }
}
