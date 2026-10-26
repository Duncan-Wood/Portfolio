import { advanceHandover, stagesBegun, type HandoverStage } from './handover';

export interface SequenceWorld {
  resolving: boolean;
  storyHolding: boolean;
}

export class LockSequence {
  private isSolved = false;
  private revealPending = false;
  private elapsed: number | null = null;

  get solved(): boolean {
    return this.isSolved;
  }

  get handingOver(): boolean {
    return this.elapsed !== null;
  }

  reset(): void {
    this.isSolved = false;
    this.revealPending = false;
    this.elapsed = null;
  }

  checkSolved(world: SequenceWorld, boardIsSolved: () => boolean): boolean {
    if (this.isSolved || world.resolving || world.storyHolding || !boardIsSolved()) {
      return false;
    }

    this.isSolved = true;
    this.revealPending = true;
    return true;
  }

  takeReveal(world: SequenceWorld): boolean {
    if (!this.revealPending || world.resolving || world.storyHolding) {
      return false;
    }

    this.revealPending = false;
    return true;
  }

  advance(delta: number, world: SequenceWorld): HandoverStage[] {
    if (!this.isSolved || world.storyHolding) {
      return [];
    }

    const settled = !world.resolving && !this.revealPending;
    const before = this.elapsed ?? -1;
    const elapsed = this.elapsed === null ? 0 : advanceHandover(this.elapsed, delta, settled);
    this.elapsed = elapsed;

    return stagesBegun(before, elapsed);
  }
}
