import {
  BUILD_DURATION,
  MAP_COLUMNS,
  MAP_PINS,
  MAP_ROWS,
  MAP_THREADS,
  PIN_MARK,
  THREAD_MARK,
  pinCells,
  pinLanded,
  threadCells,
  threadRun,
} from '../customer-map';
import { memoryArtCell, paintMemoryMark } from './tile-textures';

const CELL = memoryArtCell(MAP_COLUMNS);
const THREAD_CELLS = MAP_THREADS.map((thread) => threadCells(thread, MAP_COLUMNS, MAP_ROWS));
const PIN_CELLS = MAP_PINS.map((pin) => pinCells(pin, MAP_COLUMNS, MAP_ROWS));

export class CustomerMapBuild {
  readonly graphics: Phaser.GameObjects.Graphics;
  private readonly scene: Phaser.Scene;
  private building: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics().setVisible(false);
  }

  play(over: Phaser.GameObjects.Image): void {
    this.stop();
    this.graphics
      .setPosition(over.x - over.displayWidth / 2, over.y - over.displayHeight / 2)
      .setScale(over.scaleX, over.scaleY)
      .setVisible(true);

    this.draw(0);
    this.building = this.scene.tweens.addCounter({
      from: 0,
      to: BUILD_DURATION,
      duration: BUILD_DURATION,
      onUpdate: (tween) => this.draw(tween.getValue() ?? BUILD_DURATION),
      onComplete: () => this.draw(BUILD_DURATION),
    });
  }

  stop(): void {
    this.building?.remove();
    this.building = null;
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
      if (!pinLanded(index, elapsed)) {
        return;
      }
      for (const { column, row } of cells) {
        paintMemoryMark(this.graphics, PIN_MARK, column * CELL, row * CELL, CELL);
      }
    });
  }
}
