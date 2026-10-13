import { DOOR_COLUMNS, STILL_MOMENT, STREAM_LOOP, doorwayScene } from '../one-door';
import { memoryArtCell, paintMemoryBlock } from './tile-textures';

const CELL = memoryArtCell(DOOR_COLUMNS);

export class OneDoorStream {
  readonly graphics: Phaser.GameObjects.Graphics;
  private elapsed: number | null = null;

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setVisible(false);
  }

  play(over: Phaser.GameObjects.Image): void {
    this.graphics
      .setPosition(over.x - over.displayWidth / 2, over.y - over.displayHeight / 2)
      .setScale(over.scaleX, over.scaleY)
      .setAlpha(1)
      .setVisible(true);

    this.elapsed = STILL_MOMENT;
    this.draw();
  }

  advance(delta: number): void {
    if (this.elapsed === null) {
      return;
    }
    this.elapsed = (this.elapsed + delta) % STREAM_LOOP;
    this.draw();
  }

  stop(): void {
    this.elapsed = null;
    this.graphics.clear().setVisible(false);
  }

  private draw(): void {
    this.graphics.clear();
    for (const shape of doorwayScene(this.elapsed!)) {
      paintMemoryBlock(
        this.graphics,
        shape.mark,
        shape.column * CELL,
        shape.row * CELL,
        CELL,
        shape.width,
        shape.height,
      );
    }
  }
}
