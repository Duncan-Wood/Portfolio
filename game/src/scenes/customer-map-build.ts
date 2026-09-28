import {
  BUILD_DURATION,
  MAP_COLUMNS,
  MAP_PINS,
  MAP_ROWS,
  MAP_THREADS,
  PIN_MARK,
  THREAD_MARK,
  pinCells,
  pinDrop,
  threadCells,
  threadRun,
} from '../customer-map';
import { memoryArtCell, paintMemoryMark } from './tile-textures';

const CELL = memoryArtCell(MAP_COLUMNS);
const THREAD_CELLS = MAP_THREADS.map((thread) => threadCells(thread, MAP_COLUMNS, MAP_ROWS));
const PIN_CELLS = MAP_PINS.map((pin) => pinCells(pin, MAP_COLUMNS, MAP_ROWS));

export class CustomerMapBuild {
  readonly graphics: Phaser.GameObjects.Graphics;
  private elapsed: number | null = null;

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setVisible(false);
  }

  play(over: Phaser.GameObjects.Image): void {
    this.stop();
    this.graphics
      .setPosition(over.x - over.displayWidth / 2, over.y - over.displayHeight / 2)
      .setScale(over.scaleX, over.scaleY)
      .setAlpha(1)
      .setVisible(true);

    this.elapsed = 0;
    this.draw(0);
  }

  advance(delta: number): void {
    if (this.elapsed === null || this.elapsed >= BUILD_DURATION) {
      return;
    }
    this.elapsed = Math.min(this.elapsed + delta, BUILD_DURATION);
    this.draw(this.elapsed);
  }

  stop(): void {
    this.elapsed = null;
    this.graphics.clear().setVisible(false);
  }

  private draw(elapsed: number): void {
    this.graphics.clear();

    THREAD_CELLS.forEach((cells, index) => {
      const shown = Math.round(threadRun(index, elapsed) * cells.length);
      for (const { column, row } of cells.slice(0, shown)) {
        paintMemoryMark(this.graphics, THREAD_MARK, column * CELL, row * CELL, CELL);
      }
    });

    PIN_CELLS.forEach((cells, index) => {
      const drop = pinDrop(index, elapsed);
      if (drop === null) {
        return;
      }
      const lift = Math.round(drop);
      for (const { column, row } of cells) {
        paintMemoryMark(this.graphics, PIN_MARK, column * CELL, (row - lift) * CELL, CELL);
      }
    });
  }
}
