import { type HorizontalDirection } from './input-translator';

export type TouchAction = 'left' | 'right' | 'rotate' | 'softDrop' | 'drop';

export class TouchControls {
  private held: TouchAction[] = [];

  private pending = new Set<TouchAction>();

  press(action: TouchAction): void {
    if (this.held.includes(action)) {
      return;
    }

    this.held.push(action);

    if (action === 'rotate' || action === 'drop') {
      this.pending.add(action);
    }
  }

  release(action: TouchAction): void {
    this.held = this.held.filter((held) => held !== action);
  }

  releaseAll(): void {
    this.held = [];
    this.pending.clear();
  }

  get direction(): HorizontalDirection | null {
    for (let index = this.held.length - 1; index >= 0; index -= 1) {
      if (this.held[index] === 'left') {
        return -1;
      }
      if (this.held[index] === 'right') {
        return 1;
      }
    }

    return null;
  }

  get softDropHeld(): boolean {
    return this.held.includes('softDrop');
  }

  takeRotate(): boolean {
    return this.pending.delete('rotate');
  }

  takeDrop(): boolean {
    return this.pending.delete('drop');
  }
}
