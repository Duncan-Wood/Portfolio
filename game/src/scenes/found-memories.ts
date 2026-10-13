import { memoryArtTexture } from './tile-textures';

const PICTURE_BOX = 100;
const PICTURE_GAP = 14;
const FRAME_MARGIN = 5;
const TITLE_GAP = 22;
const DIMMED = 0.45;

export interface FoundEntry {
  title: string;
  photo?: string;
}


export class FoundMemories {
  readonly pictures: (Phaser.GameObjects.Image | null)[];


  private readonly centerX: number;
  private readonly maxWidth: number;
  private readonly frame: Phaser.GameObjects.Graphics;
  private readonly title: Phaser.GameObjects.Text;
  private readonly entries: readonly FoundEntry[];

  private shown: number[] = [];
  private selectedAt = 0;

  constructor(
    scene: Phaser.Scene,
    entries: readonly FoundEntry[],
    centerX: number,
    rowY: number,
    maxWidth: number,
  ) {
    this.entries = entries;
    this.centerX = centerX;
    this.maxWidth = maxWidth;

    this.frame = scene.add.graphics().setVisible(false);

    this.pictures = entries.map((entry) => {
      if (entry.title === '') {
        return null;
      }

      const key = memoryArtTexture(entry.photo!);
      if (!scene.textures.exists(key)) {
        return null;
      }

      const picture = scene.add.image(0, rowY, key).setVisible(false);
      return picture.setInteractive({ useHandCursor: true });
    });

    scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.reachFor(pointer.x, pointer.y);
    });

    this.title = scene.add.text(centerX, rowY + PICTURE_BOX / 2 + TITLE_GAP, '', {
      fontFamily: 'monospace',
      fontSize: '17px',
      color: '#c98cff',
    }).setOrigin(0.5, 0.5).setVisible(false);
  }

  get showing(): boolean {
    return this.shown.length > 0;
  }

  get selected(): number {
    return this.shown[this.selectedAt];
  }

  show(indices: readonly number[], select?: number): void {
    this.hide();
    this.shown = indices.filter((index) => this.pictures[index] !== null);
    if (this.shown.length === 0) {
      return;
    }

    const box = this.boxFor(this.shown.length);
    const width = this.shown.length * box + (this.shown.length - 1) * PICTURE_GAP;
    const left = this.centerX - width / 2 + box / 2;
    this.shown.forEach((index, position) => {
      const picture = this.pictures[index]!;
      picture
        .setScale(Math.min(box / picture.width, box / picture.height))
        .setX(left + position * (box + PICTURE_GAP))
        .setVisible(true);
    });

    const at = select === undefined ? -1 : this.shown.indexOf(select);
    this.selectedAt = at === -1 ? this.shown.length - 1 : at;
    this.highlight();
  }

  private reachFor(x: number, y: number): void {
    if (!this.showing) {
      return;
    }

    const under = this.shown.findIndex((index) => {
      const picture = this.pictures[index]!;
      return Math.abs(picture.x - x) <= picture.displayWidth / 2
        && Math.abs(picture.y - y) <= picture.displayHeight / 2;
    });

    if (under === -1 || under === this.selectedAt) {
      return;
    }

    this.selectedAt = under;
    this.highlight();
  }

  select(index: number): void {
    const at = this.shown.indexOf(index);
    if (at === -1 || at === this.selectedAt) {
      return;
    }

    this.selectedAt = at;
    this.highlight();
  }

  move(direction: -1 | 1): void {
    if (!this.showing) {
      return;
    }

    this.selectedAt = Math.max(0, Math.min(this.shown.length - 1, this.selectedAt + direction));
    this.highlight();
  }

  hide(): void {
    for (const picture of this.pictures) {
      picture?.setVisible(false);
    }
    this.frame.setVisible(false);
    this.title.setVisible(false);
    this.shown = [];
  }

  private boxFor(count: number): number {
    const room = (this.maxWidth - (count - 1) * PICTURE_GAP) / count;
    return Math.min(PICTURE_BOX, room);
  }

  private highlight(): void {
    this.shown.forEach((index, position) => {
      this.pictures[index]!.setAlpha(position === this.selectedAt ? 1 : DIMMED);
    });

    const picture = this.pictures[this.selected]!;
    this.frame.clear()
      .lineStyle(2, 0xc98cff, 1)
      .strokeRect(
        picture.x - picture.displayWidth / 2 - FRAME_MARGIN,
        picture.y - picture.displayHeight / 2 - FRAME_MARGIN,
        picture.displayWidth + FRAME_MARGIN * 2,
        picture.displayHeight + FRAME_MARGIN * 2,
      )
      .setVisible(true);

    this.title.setText(this.entries[this.selected].title).setVisible(true);
  }
}
