import { COLUMNS } from './grid';
import { Board } from './board';
import { FallingPair } from './falling-pair';
import { resolveChain, scoreChain } from './matching';
import { DEFAULT_TUNING, type Tuning } from '../tuning';

export const SPAWN_COLUMN = Math.floor((COLUMNS - 1) / 2);

export type PieceTypeSupplier = () => [number, number];

export class Simulation {
  readonly board = new Board();
  pair: FallingPair;
  softDropping = false;
  piecesSpawned = 0;
  score = 0;

  private fallProgress = 0;
  private lockTimer = 0;

  constructor(
    private nextPieceTypes: PieceTypeSupplier,
    private tuning: Tuning = DEFAULT_TUNING,
  ) {
    this.pair = this.spawn();
  }

  update(delta: number): void {
    if (!this.pair.canFall(this.board)) {
      this.lockTimer += delta;
      if (this.lockTimer >= this.tuning.lockDelay) {
        this.pair.lock(this.board);
        this.score += scoreChain(resolveChain(this.board));
        this.pair = this.spawn();
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

  moveLeft(): boolean {
    return this.afterInput(this.pair.moveLeft(this.board));
  }

  moveRight(): boolean {
    return this.afterInput(this.pair.moveRight(this.board));
  }

  rotate(): boolean {
    return this.afterInput(this.pair.rotateClockwise(this.board));
  }

  private afterInput(moved: boolean): boolean {
    if (moved) {
      this.lockTimer = 0;
    }
    return moved;
  }

  private spawn(): FallingPair {
    const [pivotType, satelliteType] = this.nextPieceTypes();
    this.fallProgress = 0;
    this.lockTimer = 0;
    this.piecesSpawned += 1;
    return new FallingPair(SPAWN_COLUMN, 0, 0, pivotType, satelliteType);
  }
}
