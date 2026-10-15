import { READER_PICTURE_GAP, READER_PICTURE_MAX_WIDTH, pictureRoom } from '../reader-fit';
import { MemoryPicture } from './memory-picture';

export interface ReaderArea {
  centerX: number;
  top: number;
  bottom: number;
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
    this.picture.show(photo, READER_PICTURE_MAX_WIDTH, pictureRoom(this.body.height));

    const pictureHeight = this.picture.height;
    const gap = pictureHeight > 0 ? READER_PICTURE_GAP : 0;
    const total = pictureHeight + gap + this.body.height;
    const top = (this.area.top + this.area.bottom) / 2 - total / 2;

    if (pictureHeight > 0) {
      this.picture.placeAt(this.area.centerX, top + pictureHeight / 2);
    }
    this.body.setY(top + pictureHeight + gap);
  }

  advance(delta: number): void {
    this.picture.advance(delta);
  }

  hide(): void {
    this.picture.hide();
    this.body.setVisible(false);
  }
}
