import { GROUND_COLOR } from '../palette';
import { MemoryPicture } from './memory-picture';

const PHOTO_MAX_WIDTH = 368;
const PHOTO_MAX_HEIGHT = 300;
const REVEAL_GAP = 26;

const REVEAL_SKIP_GRACE = 420;

const REVEAL_BODY_COLOR = '#e8eef2';

export interface RevealArea {
  centerX: number;
  centerY: number;
  coverWidth: number;
  coverHeight: number;
  textWidth: number;
}

export class RevealCard {
  private readonly scene: Phaser.Scene;
  private readonly centerX: number;
  private readonly centerY: number;
  private readonly skipPrompt: string;

  private readonly scrim: Phaser.GameObjects.Rectangle;
  private readonly picture: MemoryPicture;
  private readonly title: Phaser.GameObjects.Text;
  private readonly body: Phaser.GameObjects.Text;
  private readonly hint: Phaser.GameObjects.Text;

  private isHolding = false;
  private skippableIn = 0;

  constructor(scene: Phaser.Scene, area: RevealArea, skipPrompt: string) {
    this.scene = scene;
    this.centerX = area.centerX;
    this.centerY = area.centerY;
    this.skipPrompt = skipPrompt;

    this.scrim = scene.add.rectangle(
      area.centerX,
      area.centerY,
      area.coverWidth,
      area.coverHeight,
      GROUND_COLOR,
    ).setVisible(false);

    this.picture = new MemoryPicture(scene);

    this.title = scene.add.text(area.centerX, area.centerY - 70, '', {
      fontFamily: 'monospace',
      fontSize: '26px',
      color: '#c98cff',
      align: 'center',
      wordWrap: { width: area.textWidth - 40 },
    }).setOrigin(0.5, 0.5).setVisible(false);

    this.body = scene.add.text(area.centerX, area.centerY + 10, '', {
      fontFamily: 'monospace',
      fontSize: '17px',
      color: REVEAL_BODY_COLOR,
      align: 'center',
      wordWrap: { width: area.textWidth - 56 },
      lineSpacing: 7,
    }).setOrigin(0.5, 0.5).setVisible(false);

    this.hint = scene.add.text(area.centerX, area.centerY + 96, skipPrompt, {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#9481aa',
    }).setOrigin(0.5, 0.5).setVisible(false);
  }

  get holding(): boolean {
    return this.isHolding;
  }

  show(title: string, body: string, photo?: string): void {
    this.body.setColor(REVEAL_BODY_COLOR);
    this.isHolding = true;
    this.skippableIn = REVEAL_SKIP_GRACE;
    this.hint.setText(this.skipPrompt).setVisible(false);

    this.scene.tweens.killTweensOf([this.scrim, this.title, this.body, ...this.picture.parts]);

    this.picture.show(photo, PHOTO_MAX_WIDTH, PHOTO_MAX_HEIGHT);
    this.title.setText(title).setVisible(title !== '');
    this.body.setText(body).setVisible(true);

    this.layOut();

    const scrimAlpha = this.scrim.visible ? this.scrim.alpha : 0;
    this.scrim.setVisible(true).setAlpha(scrimAlpha);
    this.scene.tweens.add({ targets: this.scrim, alpha: 1, duration: 240 });

    for (const part of [this.title, this.body, ...this.picture.parts]) {
      if (!part.visible) {
        continue;
      }
      part.setAlpha(0);
      this.scene.tweens.add({ targets: part, alpha: 1, duration: 340, delay: 160 });
    }
  }

  advance(delta: number): void {
    this.picture.advance(delta);
  }

  setBodyColor(color: string): void {
    this.body.setColor(color);
  }

  waitForSkip(delta: number, skipPressed: () => boolean): boolean {
    if (this.skippableIn > 0) {
      this.skippableIn -= delta;
      if (this.skippableIn <= 0) {
        this.hint.setVisible(true).setAlpha(0);
        this.scene.tweens.add({ targets: this.hint, alpha: 1, duration: 260 });
      }
      return false;
    }

    if (!skipPressed()) {
      return false;
    }

    this.isHolding = false;
    return true;
  }

  hide(): void {
    const parts = [this.scrim, this.title, this.body, this.hint, ...this.picture.parts];
    this.scene.tweens.killTweensOf(parts);
    this.scene.tweens.add({
      targets: parts,
      alpha: 0,
      duration: 280,
      onComplete: () => {
        for (const part of parts) {
          part.setVisible(false);
        }
        this.picture.hide();
      },
    });
  }

  coverBoard(): void {
    this.isHolding = false;
    this.scrim.setVisible(true).setAlpha(1);
  }

  uncoverBoard(): void {
    this.scrim.setVisible(false);
  }

  reset(): void {
    const parts = [this.scrim, this.title, this.body, this.hint, ...this.picture.parts];
    this.scene.tweens.killTweensOf(parts);
    for (const part of parts) {
      part.setVisible(false).setAlpha(1);
    }
    this.picture.hide();
    this.skippableIn = 0;
    this.isHolding = false;
  }

  private layOut(): void {
    const photoHeight = this.picture.height;
    const titleHeight = this.title.visible ? this.title.height : 0;
    const bodyHeight = this.body.height;
    const hintHeight = this.hint.height;

    const parts: { place: (y: number) => void; height: number }[] = [];
    if (photoHeight > 0) parts.push({ place: (y) => this.picture.placeAt(this.centerX, y), height: photoHeight });
    if (titleHeight > 0) parts.push({ place: (y) => this.title.setPosition(this.centerX, y), height: titleHeight });
    parts.push({ place: (y) => this.body.setPosition(this.centerX, y), height: bodyHeight });
    parts.push({ place: (y) => this.hint.setPosition(this.centerX, y), height: hintHeight });

    const total = parts.reduce((sum, part) => sum + part.height, 0)
      + REVEAL_GAP * (parts.length - 1);

    let y = this.centerY - total / 2;
    for (const part of parts) {
      part.place(y + part.height / 2);
      y += part.height + REVEAL_GAP;
    }
  }
}
