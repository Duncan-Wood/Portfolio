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
 * The game's clock and state machine. It owns the board and the falling pair,
 * and drives everything that happens over time: gravity, the lock delay, and
 * the cascade.
 *
 * It also owns the shadow: how long the player may hesitate before it takes a
 * cell, and where it takes one. What drives it OFF the board is not here — that
 * is what clearing does, and `matching.ts` owns that.
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

  /**
   * How many pieces this board gives you, or `0` for no limit.
   *
   * The constraint that makes a board a puzzle rather than a sandbox. Gravity
   * used to be the only thing making a placement a commitment; with it cut and
   * pieces unlimited, every board fell to brute force — place until four touch.
   * A budget restores the commitment without putting a clock back in front of a
   * puzzle you were meant to think about, which is the trade cutting gravity
   * was for.
   *
   * A COUNT, not a timer, and that distinction is the whole design. A timer
   * punishes thinking; a count prices it at nothing and prices ACTION instead,
   * which is what makes one cascade reaching two neurons worth more than two
   * clears reaching two — same result, half the board's resources.
   *
   * `0` means unlimited, and it is the default so nothing that does not set a
   * budget has to know this exists: every test written before it, and the
   * endless board itself, behave exactly as they did.
   */
  pieceBudget = 0;

  chainLength = 0;

  /**
   * The antagonist, stated as a rule: it arrives when the player stops
   * connecting things, it matches nothing, and it only leaves when something
   * clears beside it. The part of you that stops without finishing takes more
   * of the board the longer you hesitate, and light is what pushes it back.
   *
   * How many cells the shadow has taken this run, and the last one it took.
   *
   * The counter is what the scene watches, for the reason `piecesSpawned`
   * exists: the engine promises the number ticks, not that anything is
   * reallocated. Without it an arrival is invisible — the shadow simply is
   * where it was not, with no moment to react to and nothing to sound.
   *
   * Only a landed arrival counts. When there is nowhere left to put one the run
   * is over instead, and announcing an arrival there would have the scene
   * animating a creature into a cell it never reached.
   */
  shadowTaken = 0;

  lastShadowCell: GroupCell | null = null;

  /**
   * Cells the shadow currently holds.
   *
   * COUNTED from the board rather than tracked alongside it. A running tally
   * was one line shorter and immediately went wrong: anything that put shadow
   * on the board by another route left the two disagreeing, and a test passed
   * because a shadow tile had merely fallen rather than been pushed back.
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
   * Milliseconds since anything last cleared. Not since the last input — a
   * player can shuffle a piece back and forth all day and still be stalling.
   */
  private stallTimer = 0;

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
   * The shadow's patience runs alongside 2 and 3, but never during 1: time
   * spent watching a cascade is not time spent hesitating.
   *
   * The engine deliberately does NOT clamp `delta`; it trusts its caller. The
   * caller's job is to bound it, which `FixedTimestep` does.
   */
  update(delta: number): void {
    if (this.toppedOut) {
      return;
    }

    if (this.resolving) {
      // Time spent watching a cascade is not time spent hesitating, so the
      // shadow's patience does not run while the board is still resolving.
      this.advanceChain(delta);
      return;
    }

    // A spent board is finished, whatever it looks like. The cascade from the
    // last piece was allowed to play out above — `outOfPieces` goes true inside
    // `lockPair`, before the chain it started has resolved — but nothing may
    // accrue on a board the player can no longer act on. A shadow arriving
    // after the last piece is a punishment for a decision nobody was allowed to
    // make.
    if (this.outOfPieces) {
      return;
    }

    this.stallTimer += delta;
    if (this.stallTimer >= this.tuning.shadowInterval) {
      this.stallTimer = 0;
      this.encroach();

      // Kept as a guard rather than deleted, though `encroach` can no longer
      // reach it: it used to end the run when the shadow had nowhere to land,
      // and possessing a tile has no such failure. The RULE it encodes is
      // still real and costs one comparison — nothing after an arrival may run
      // on a board the run has already lost. Without it, back when this could
      // fire, the falling pair committed anyway: its halves were written to a
      // lost board, a landing sounded after the game was over, and a group
      // completed by that phantom lock started a cascade that could never
      // resolve, because every later update returns at the top on `toppedOut`.
      if (this.toppedOut) {
        return;
      }
    }

    // Nothing moves or commits itself while gravity is off and the piece is
    // still IN THE AIR. That is the point of cutting gravity: a board can be
    // thought about for as long as it takes, and no clock takes the decision
    // away while the piece is somewhere the player has not chosen yet.
    //
    // A piece that has LANDED is a different case, and this used to get it
    // wrong. It held the lock timer at zero there too, so the only thing that
    // could ever commit a piece was `hardDrop` — every single placement in the
    // game cost a press of space after the piece was already exactly where the
    // player wanted it. That is not a decision, it is a keystroke tax, and it
    // broke the flow of the one action the game is made of. A landed piece
    // settles on the lock delay, like it does in every game in this genre, and
    // the delay still resets on a move so it can be slid along the floor.
    if (!this.tuning.gravityEnabled && !this.softDropping && this.pair.canFall(this.board)) {
      this.lockTimer = 0;
      return;
    }

    if (!this.pair.canFall(this.board)) {
      // LOCK DELAY: a grace period between touching down and being committed.
      // Without it a landed piece freezes instantly and you can never slide it
      // into a gap at the last moment, which feels punishing.
      //
      // It runs with gravity off too. It used to return here instead, which is
      // what made space the only way to commit anything — see the note above
      // the airborne guard.
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
  /**
   * Pieces left before the board is spent, or `Infinity` when unbudgeted.
   *
   * Floored at zero rather than allowed to go negative: the number is drawn on
   * screen, and "-1 pieces" is a bug the player reads before anyone else does.
   */
  get piecesRemaining(): number {
    return this.pieceBudget === 0
      ? Infinity
      : Math.max(this.pieceBudget - this.piecesLocked, 0);
  }

  /**
   * True once the budget is spent. Input is refused from here, the same as
   * after a top-out and for the same reason: the board is final, and it stays
   * on screen so the player can see the position they ran out in.
   *
   * What HAPPENS next is not this file's business. A spent board is a board
   * that failed its lock, and the run structure above decides whether that
   * means re-seeding the same lock or something else.
   */
  get outOfPieces(): boolean {
    return this.pieceBudget !== 0 && this.piecesLocked >= this.pieceBudget;
  }

  private get acceptsInput(): boolean {
    return !this.resolving && !this.toppedOut && !this.outOfPieces;
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

    // The depth this link lands at is also what it damages shadow by, so the
    // same 0-based index that doubles the score is what decides whether the
    // clear kills what it is touching or only dents it.
    const link = clearStep(this.board, this.chainLength);
    if (link === null) {
      // Not a beat: the cascade is simply over, and nothing moved to show.
      this.resolving = false;
      this.spawnOrTopOut();
      return;
    }

    // `chainLength` is the 0-based index of this link, so the first link of a
    // cascade scores at 1x and each subsequent one doubles.
    // `clearStep` has already driven back whatever shadow was touching this
    // link — the rule lives with the clearing, in `matching.ts`.
    this.stallTimer = 0;

    const connections = link.cellsCleared * (this.chainLength + 1);

    this.score += scoreLink(link, this.chainLength);
    this.connectionsMade += connections;
    this.chainLength += 1;
    this.settlePending = true;
    this.recordBeat({ kind: 'clear', link, connections });
  }

  /**
   * The player answered the question: drive every shadow off the board at once.
   *
   * The single most powerful thing in the game, and the only one the player
   * spends rather than earns — a question can be declined, and declining keeps
   * every cell the shadow took. That is the thesis stated as a rule instead of
   * as a line of narration: a connection is what pushes the dark back, so
   * making one has to be what pushes it back.
   *
   * WHAT was typed never reaches here, and must not. The engine is told that an
   * answer happened, never what it said; nothing scores it, branches on it or
   * stores it. The act is the mechanic, and the words belong to whoever typed
   * them.
   *
   * Returns the cells it took, deepest first, so the scene can play the wave
   * rising out of the stack. Ordered here rather than scene-side because the
   * board is empty by the time anything renders — the same reason a link
   * reports its own push-back.
   */
  answerQuestion(): { driven: readonly ShadowHit[]; settled: readonly TileMove[] } {
    const driven: ShadowHit[] = [];

    for (let row = ROWS - 1; row >= 0; row -= 1) {
      for (let column = 0; column < COLUMNS; column += 1) {
        const cell = this.board.pieceAt(column, row);
        if (isShadow(cell)) {
          this.board.clear(column, row);
          // Reported so the wave can blow off the creature that was actually
          // standing there, over the tile it was holding. Answering ignores
          // the tier — it is the one thing in the game that does.
          driven.push({ column, row, strength: 1, turnedTo: shadowHolding(cell) });
        }
      }
    }

    // SETTLE. Driving the shadow off empties cells in the middle of the stack,
    // and without this every tile that was resting on one hung in mid-air until
    // the next lock snapped it down with no animation — the strongest moment in
    // the game followed immediately by the board glitching.
    //
    // The moves are handed back for the same reason a cascade's are: by the
    // time anything renders, the board is already settled, so where a tile fell
    // FROM is not recoverable by looking at it.
    return { driven, settled: this.board.settle() };
  }

  /**
   * Take the topmost tile of the emptiest column that has one.
   *
   * It POSSESSES a tile rather than filling an empty cell, and that changes
   * what the antagonist is. It no longer drops junk on the board to crowd the
   * player out; it takes something they already made and switches it off, so
   * it genuinely severs the connections between whatever it sits between. The
   * threat stops being "you will run out of room" and becomes "the board you
   * built stops working" — which is the one this game is actually about.
   *
   * The emptiest column, still, and for the reason it always was: the cruel
   * choice would be to pile on where the player is already in trouble, but the
   * shadow is not trying to kill them, it is trying to make the board less
   * connected. Spreading it costs them reach everywhere instead of ending the
   * run in one place. The TOPMOST tile of that column, because a tile buried
   * under six others is not one they were about to use.
   *
   * NO column is off limits, including the one the falling pair is in. That
   * skip was load-bearing when the shadow dropped into an empty cell — the
   * pair is not on the board until it locks, so a column scan looked straight
   * through it and the shadow could take the very cell the pair was about to
   * occupy, and locking then wrote a tile over a tile and threw. Possession
   * cannot do that: it only ever takes a cell that is ALREADY occupied, and
   * the pair only ever locks into empty ones, so occupancy is unchanged and
   * there is nothing to collide with.
   *
   * Deleting it also closed a hole the smoke test found. A player who never
   * moves the piece stacks everything in the spawn column, and with that
   * column skipped there was no tile anywhere the shadow was allowed to touch
   * — so doing nothing at all, the one thing this antagonist exists to
   * punish, went completely unpunished for a whole run.
   *
   * If there is nothing to take, nothing happens. That is deliberate and it is
   * a change: this used to end the run when the shadow had nowhere to land,
   * which no longer means anything now that it needs a tile rather than a
   * space. A board with no tiles on it is a board the player has just cleared,
   * and the antagonist of "you stopped before you finished" has no business
   * winning there. Topping out is `spawnOrTopOut`'s job alone now.
   */
  /**
   * The tile the shadow would take if it arrived right now, or `null`.
   *
   * Split out of `encroach` and made public so the scene can point at it
   * BEFORE it happens. The six seconds of hesitation this game runs on were
   * completely invisible — nothing on screen represented the clock, and a
   * creature simply appeared on a tile with no warning and no way to read what
   * was coming. A threat you cannot see coming is not pressure, it is an
   * interruption.
   *
   * Pure: it reads the board and chooses, and changes nothing.
   */
  get threatenedCell(): GroupCell | null {
    let chosenColumn = -1;
    let chosenRow = -1;
    let fewest = Number.POSITIVE_INFINITY;

    for (let column = 0; column < COLUMNS; column += 1) {
      let tiles = 0;
      let topmost = -1;

      for (let row = FIRST_VISIBLE_ROW; row < ROWS; row += 1) {
        // Only a real colour can be possessed. A cell the shadow already holds
        // is not a foothold it can take twice.
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

  /**
   * How close the next arrival is, 0 to 1.
   *
   * The counter-play is the same verb the whole game is about, so this has to
   * be watchable: it fills while nothing connects and drops to nothing the
   * moment something does.
   */
  get stallProgress(): number {
    return Math.min(this.stallTimer / this.tuning.shadowInterval, 1);
  }

  private encroach(): void {
    const target = this.threatenedCell;
    if (target === null) {
      return;
    }

    const { column: chosenColumn, row: chosenRow } = target;

    // Strength escalates with how many arrivals this run has already had, so
    // the first few are freed by an ordinary clear and the late ones are not.
    // `shadowTaken` is still 0 here for the first arrival, which is what makes
    // the opening tier the weakest one.
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
