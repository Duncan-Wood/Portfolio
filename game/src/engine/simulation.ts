import {
  COLUMNS,
  FIRST_VISIBLE_ROW,
  ROWS,
  isColour,
  isShadow,
  shadowCell,
} from './grid';
import { Board, type TileMove } from './board';
import { FallingPair, type PairCell } from './falling-pair';
import {
  clearStep,
  findGroups,
  scoreLink,
  type ChainLink,
  type GroupCell,
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

  piecesSpawned = 0;

  score = 0;

  resolving = false;

  toppedOut = false;

  pieceBudget = 0;

  chainLength = 0;

  deepestChain = 0;

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

  private stallTimer = 0;

  connectionsMade = 0;

  beatsPlayed = 0;

  lastBeat: CascadeBeat | null = null;

  piecesLocked = 0;

  lastLanded: readonly PairCell[] = [];

  upcoming!: [number, number];

  fallProgress = 0;

  private resolveTimer = 0;

  private settlePending = false;

  private lockTimer = 0;

  constructor(
    private nextPieceTypes: PieceTypeSupplier,
    // Read as `this.tuning.x` at the moment needed; destructuring kills live tuning.
    private tuning: Tuning = DEFAULT_TUNING,
  ) {
    this.restart();
  }

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
    this.deepestChain = 0;
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

  moveLeft(): boolean {
    return this.acceptsInput ? this.afterInput(this.pair.moveLeft(this.board)) : false;
  }

  moveRight(): boolean {
    return this.acceptsInput ? this.afterInput(this.pair.moveRight(this.board)) : false;
  }

  rotate(): boolean {
    return this.acceptsInput ? this.afterInput(this.pair.rotateClockwise(this.board)) : false;
  }

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

  rememberChain(): void {
    this.deepestChain = Math.max(this.deepestChain, this.chainLength);
  }

  get piecesRemaining(): number {
    return this.pieceBudget === 0
      ? Infinity
      : Math.max(this.pieceBudget - this.piecesLocked, 0);
  }

  get outOfPieces(): boolean {
    return this.pieceBudget !== 0 && this.piecesLocked >= this.pieceBudget;
  }

  get hasNextPiece(): boolean {
    return this.piecesRemaining > 1;
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

    const link = clearStep(this.board);
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
    this.rememberChain();
    this.settlePending = true;
    this.recordBeat({ kind: 'clear', link, connections });
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

  private encroach(): void {
    const target = this.threatenedCell;
    if (target === null) {
      return;
    }

    const { column: chosenColumn, row: chosenRow } = target;

    const taken = this.board.pieceAt(chosenColumn, chosenRow) as number;
    this.board.clear(chosenColumn, chosenRow);
    this.board.place(chosenColumn, chosenRow, shadowCell(taken));

    this.lastShadowCell = { column: chosenColumn, row: chosenRow };
    this.shadowTaken += 1;
  }

  private recordBeat(beat: CascadeBeat): void {
    this.lastBeat = beat;
    this.beatsPlayed += 1;
  }

  private lockPair(): void {
    this.lastLanded = this.pair.lock(this.board);
    this.piecesLocked += 1;

    if (findGroups(this.board).length > 0) {
      this.beginResolving();
      return;
    }

    this.spawnOrTopOut();
  }

  private beginResolving(): void {
    this.resolving = true;
    this.chainLength = 0;
    this.resolveTimer = 0;
    this.settlePending = false;
  }

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
