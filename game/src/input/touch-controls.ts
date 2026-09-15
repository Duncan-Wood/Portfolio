export type TouchAction = 'drop' | 'pause' | 'restart';

export class TouchControls {
  private pending = new Set<TouchAction>();

  press(action: TouchAction): void {
    this.pending.add(action);
  }

  takeDrop(): boolean {
    return this.pending.delete('drop');
  }

  takePause(): boolean {
    return this.pending.delete('pause');
  }

  takeRestart(): boolean {
    return this.pending.delete('restart');
  }
}
