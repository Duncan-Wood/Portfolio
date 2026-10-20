import { READER_FRAME_HEIGHT, READER_FRAME_TOP, READER_PICTURE_MAX_WIDTH, READER_TEXT_TOP } from '../reader-fit';
import { MemoryPicture } from './memory-picture';

export interface ReaderArea {
  centerX: number;
  textWidth: number;
}

export class MemoryReader {
  private readonly area: ReaderArea;
  private readonly picture: MemoryPicture;
  private readonly body: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, area: ReaderArea) {
    this.area = area;
    this.picture = new MemoryPicture(scene);

    this.body = scene.add.text(area.centerX, 0, '', {
      fontFamily: 'monospace',
      fontSize: '17px',
      color: '#e8eef2',
      align: 'center',
      wordWrap: { width: area.textWidth },
      lineSpacing: 7,
    }).setOrigin(0.5, 0).setVisible(false);
  }

  show(body: string, photo?: string): void {
    this.body.setText(body).setVisible(true);
    this.picture.show(photo, READER_PICTURE_MAX_WIDTH, READER_FRAME_HEIGHT);

    if (this.picture.height > 0) {
      this.picture.placeAt(this.area.centerX, READER_FRAME_TOP + READER_FRAME_HEIGHT / 2);
    }
    this.body.setY(READER_TEXT_TOP);
  }

  advance(delta: number): void {
    this.picture.advance(delta);
  }

  hide(): void {
    this.picture.hide();
    this.body.setVisible(false);
  }
}
