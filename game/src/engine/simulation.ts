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

export const SPAWN_COLUMN = Math.floor((COLUMNS - 1) / 2);

export const SPAWN_ROW = FIRST_VISIBLE_ROW;

type PieceTypeSupplier = () => [number, number];

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

  resolving = false;

  toppedOut = false;

  /** How many pieces this board gives you, or `0` for no limit. */
  pieceBudget = 0;

  chainLength = 0;

  shadowTaken = 0;

  lastShadowCell: GroupCell | null = null;

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
   * Since anything last CLEARED, not since the last input: a player can shuffle a
   * piece back and forth all day and still be stalling.
   */
  private stallTimer = 0;

  connectionsMade = 0;

  /**
   * The board is in its post-beat state by the time a frame renders, so the scene
   * cannot see what popped by looking. The engine leaves the result here rather
   * than calling into the scene, which keeps it free of callbacks.
   */
  beatsPlayed = 0;

  lastBeat: CascadeBeat | null = null;

  /**
   * Separate from `piecesSpawned`: a lock that starts a cascade and one that tops
   * the board out both commit a pair without spawning another, so a landing
   * inferred from the spawn counter misses the ones that matter most.
   */
  piecesLocked = 0;

  lastLanded: readonly PairCell[] = [];

  upcoming!: [number, number];

  /**
   * A FRACTION of the current interval, never elapsed milliseconds. Banking
   * milliseconds lets a rate change re-price the bank: time accumulated against a
   * slow gravity step, spent at the soft-drop rate, is several rows of fall in one
   * frame. A fraction cannot burst, so `fallInterval` is safe to change mid-fall.
   */
  fallProgress = 0;

  private resolveTimer = 0;

  private settlePending = false;

  private lockTimer = 0;

  constructor(
    private nextPieceTypes: PieceTypeSupplier,
    /**
     * Read as `this.tuning.x` at the moment needed, never destructured into a local,
     * or live tuning stops working.
     */
    private tuning: Tuning = DEFAULT_TUNING,
  ) {
    // `pair` and `upcoming` carry definite assignment assertions because
    // TypeScript cannot see through this call.
    this.restart();
  }

  /**
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

    if (this.outOfPieces) {
      return;
    }

    this.stallTimer += delta;
    if (this.stallTimer >= this.tuning.shadowInterval) {
      this.stallTimer = 0;
      this.encroach();
    }

    if (!this.pair.canFall(this.board)) {
      this.lockTimer += delta;

      if (this.lockTimer >= this.tuning.lockDelay) {
        this.lockPair();
      }
      return;
    }

    this.lockTimer = 0;

    const interval = this.softDropping
      ? this.tuning.softDropInterval
      : this.tuning.fallInterval;

    this.fallProgress += delta / interval;

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
    this.upcoming = this.nextPieceTypes();
    this.pair = this.spawn();
  }

  /**
   * All three refuse while a cascade resolves or after a top-out: in both states
   * `pair` still points at tiles now sitting on the board, so moving it would write
   * them a second time.
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

  /** `Infinity` when unbudgeted, and floored at zero because it is drawn. */
  get piecesRemaining(): number {
    return this.pieceBudget === 0
      ? Infinity
      : Math.max(this.pieceBudget - this.piecesLocked, 0);
  }

  get outOfPieces(): boolean {
    return this.pieceBudget !== 0 && this.piecesLocked >= this.pieceBudget;
  }

  private get acceptsInput(): boolean {
    return !this.resolving && !this.toppedOut && !this.outOfPieces;
  }

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

    const link = clearStep(this.board, this.chainLength);
    if (link === null) {
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
   * WHAT was typed never reaches here and must not: the engine is told THAT an
   * answer happened, never what it said.
   *
   * Returns the cells deepest first, so the scene can play the wave rising out of
   * the stack — the board is empty by the time anything renders.
   */
  answerQuestion(): { driven: readonly ShadowHit[]; settled: readonly TileMove[] } {
    const driven: ShadowHit[] = [];

    for (let row = ROWS - 1; row >= 0; row -= 1) {
      for (let column = 0; column < COLUMNS; column += 1) {
        const cell = this.board.pieceAt(column, row);
        if (isShadow(cell)) {
          this.board.clear(column, row);
          driven.push({ column, row, strength: 1, turnedTo: shadowHolding(cell) });
        }
      }
    }

    return { driven, settled: this.board.settle() };
  }

  get threatenedCell(): GroupCell | null {
    let chosenColumn = -1;
    let chosenRow = -1;
    let fewest = Number.POSITIVE_INFINITY;

    for (let column = 0; column < COLUMNS; column += 1) {
      let tiles = 0;
      let topmost = -1;

      for (let row = FIRST_VISIBLE_ROW; row < ROWS; row += 1) {
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

  get stallProgress(): number {
    return Math.min(this.stallTimer / this.tuning.shadowInterval, 1);
  }

  /**
   * No column is off limits, the falling pair's included: possession only takes an
   * occupied cell and the pair only locks into empty ones. If there is nothing to
   * take, nothing happens — topping out is `spawnOrTopOut`'s job.
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
   * Peek before committing to a cascade: if the lock matched nothing the next pair
   * spawns immediately. Shared by the lock delay and `hardDrop`, so they cannot
   * drift.
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
   * The candidate is built and asked whether it fits rather than testing the spawn
   * cells by hand: `FallingPair` owns where a satellite sits at each orientation.
   * Asking first is what keeps `place` able to throw on an occupied cell.
   */
  private spawnOrTopOut(): void {
    if (!this.nextPair().fitsOn(this.board)) {
      this.toppedOut = true;
      return;
    }

    this.pair = this.spawn();
  }

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

  private nextPair(): FallingPair {
    const [pivotType, satelliteType] = this.upcoming;
    return new FallingPair(SPAWN_COLUMN, SPAWN_ROW, 0, pivotType, satelliteType);
  }
}
