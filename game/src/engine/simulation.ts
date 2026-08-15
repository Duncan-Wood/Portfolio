import { COLUMNS } from './grid';
import { Board } from './board';
import { FallingPair } from './falling-pair';

export const FALL_INTERVAL = 800;
export const SOFT_DROP_INTERVAL = 50;
export const LOCK_DELAY = 500;
export const SPAWN_COLUMN = Math.floor((COLUMNS - 1) / 2);

export type PieceTypeSupplier = () => [number, number];

export class Simulation {
  readonly board = new Board();
  pair: FallingPair;
  softDropping = false;

  private fallTimer = 0;
  private lockTimer = 0;

  constructor(private nextPieceTypes: PieceTypeSupplier) {
    this.pair = this.spawn();
  }

  update(delta: number): void {
    if (!this.pair.canFall(this.board)) {
      this.lockTimer += delta;
      if (this.lockTimer >= LOCK_DELAY) {
        this.pair.lock(this.board);
        this.pair = this.spawn();
      }
      return;
    }

    this.lockTimer = 0;
    this.fallTimer += delta;

    const interval = this.softDropping ? SOFT_DROP_INTERVAL : FALL_INTERVAL;
    while (this.fallTimer >= interval && this.pair.fall(this.board)) {
      this.fallTimer -= interval;
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
    this.fallTimer = 0;
    this.lockTimer = 0;
    return new FallingPair(SPAWN_COLUMN, 0, 0, pivotType, satelliteType);
  }
}
