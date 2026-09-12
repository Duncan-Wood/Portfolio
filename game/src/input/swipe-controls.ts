export type SwipeAction = 'left' | 'right' | 'rotate' | 'drop';

export interface SwipeTuning {
  columnDistance: number;
  tapMaxDistance: number;
  tapMaxDuration: number;
  dropMinDistance: number;
  dropMaxDuration: number;
}

interface Touch {
  startX: number;
  startY: number;
  startedAt: number;
  steppedFromX: number;
  travelled: number;
  dropped: boolean;
}

export class SwipeControls {
  private touch: Touch | null = null;

  private queue: SwipeAction[] = [];

  constructor(private tuning: SwipeTuning) {}

  get gesturing(): boolean {
    return this.touch !== null;
  }

  begin(x: number, y: number, at: number): void {
    this.touch = {
      startX: x,
      startY: y,
      startedAt: at,
      steppedFromX: x,
      travelled: 0,
      dropped: false,
    };
  }

  move(x: number, y: number, at: number): void {
    const touch = this.touch;
    if (touch === null) {
      return;
    }

    touch.travelled = Math.max(touch.travelled, Math.hypot(x - touch.startX, y - touch.startY));

    if (!touch.dropped && this.isDropFlick(touch, x, y, at)) {
      touch.dropped = true;
      this.queue.push('drop');
      return;
    }

    if (touch.dropped) {
      return;
    }

    const { columnDistance } = this.tuning;
    let drift = x - touch.steppedFromX;

    while (Math.abs(drift) >= columnDistance) {
      const step = Math.sign(drift);
      this.queue.push(step > 0 ? 'right' : 'left');
      touch.steppedFromX += step * columnDistance;
      drift = x - touch.steppedFromX;
    }
  }

  end(x: number, y: number, at: number): void {
    const touch = this.touch;
    this.touch = null;

    if (touch === null || touch.dropped) {
      return;
    }

    const travelled = Math.max(touch.travelled, Math.hypot(x - touch.startX, y - touch.startY));
    const held = at - touch.startedAt;

    if (travelled <= this.tuning.tapMaxDistance && held <= this.tuning.tapMaxDuration) {
      this.queue.push('rotate');
    }
  }

  cancel(): void {
    this.touch = null;
    this.queue = [];
  }

  take(): SwipeAction | null {
    return this.queue.shift() ?? null;
  }

  private isDropFlick(touch: Touch, x: number, y: number, at: number): boolean {
    const down = y - touch.startY;
    const across = Math.abs(x - touch.startX);

    return down >= this.tuning.dropMinDistance
      && down > across
      && at - touch.startedAt <= this.tuning.dropMaxDuration;
  }
}
