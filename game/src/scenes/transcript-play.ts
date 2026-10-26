import { STILL_MOMENT, TRANSCRIPT_LOOP, transcriptScene } from '../transcript-page';
import { TRANSCRIPT_BASE } from '../memory-pictures';
import { memoryArtCell, paintMemoryBlock } from './tile-textures';

const CELL = memoryArtCell(TRANSCRIPT_BASE.columns);

export class TranscriptPlay {
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
    this.elapsed = (this.elapsed + delta) % TRANSCRIPT_LOOP;
    this.draw();
  }

  stop(): void {
    this.elapsed = null;
    this.graphics.clear().setVisible(false);
  }

  private draw(): void {
    this.graphics.clear();
    for (const shape of transcriptScene(this.elapsed!)) {
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
