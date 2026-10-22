import { GROUND_COLOR } from '../palette';
import { memoryArtTexture } from './tile-textures';
import {
  FOUND_CAUGHT_HOLD_MS,
  FOUND_CAUGHT_WIDTH,
  FOUND_DROP_MS,
  FOUND_LANDED_WIDTH,
  FOUND_LAND_FADE_MS,
  type FlightHooks,
  type LandingPlace,
} from './memory-panel';

const BLOOM_WIDTH = 300;
const BLOOM_FROM_SCALE = 0.6;
const BLOOM_GROW_MS = 320;
const TITLE_GAP = 22;
const TITLE_FADE_MS = 160;

interface BoardArea {
  centerX: number;
  centerY: number;
  width: number;
  height: number;
}

export class MemoryHandover {
  private readonly scene: Phaser.Scene;
  private readonly cover: Phaser.GameObjects.Rectangle;
  private readonly picture: Phaser.GameObjects.Image;
  private readonly title: Phaser.GameObjects.Text;
  private readonly board: BoardArea;
  private readonly landing: LandingPlace;

  constructor(scene: Phaser.Scene, board: BoardArea, landing: LandingPlace) {
    this.scene = scene;
    this.board = board;
    this.landing = landing;

    this.cover = scene.add.rectangle(
      board.centerX,
      board.centerY,
      board.width,
      board.height,
      GROUND_COLOR,
    ).setVisible(false);

    this.picture = scene.add.image(board.centerX, board.centerY, '__DEFAULT').setVisible(false);

    this.title = scene.add.text(board.centerX, 0, '', {
      fontFamily: 'monospace',
      fontSize: '19px',
      color: '#f2e2c4',
      backgroundColor: '#221038',
      padding: { x: 14, y: 8 },
    }).setOrigin(0.5, 0).setVisible(false);
  }

  coverBoard(duration: number): void {
    this.cover.setVisible(true).setAlpha(0);
    this.scene.tweens.add({ targets: this.cover, alpha: 1, duration, ease: 'Sine.easeInOut' });
  }

  uncoverBoard(duration: number): void {
    this.cover.setVisible(true).setAlpha(1);
    this.scene.tweens.add({
      targets: this.cover,
      alpha: 0,
      duration,
      ease: 'Sine.easeInOut',
      onComplete: () => this.cover.setVisible(false),
    });
  }

  bloom(photo: string | undefined, title: string): void {
    const key = photo === undefined ? null : memoryArtTexture(photo);
    let bottom = this.board.centerY;

    if (key !== null && this.scene.textures.exists(key)) {
      this.picture.setTexture(key).setPosition(this.board.centerX, this.board.centerY);
      this.picture.setDisplaySize(BLOOM_WIDTH, BLOOM_WIDTH * (this.picture.height / this.picture.width));
      const fullScale = this.picture.scaleX;
      bottom += this.picture.displayHeight / 2;

      this.picture.setScale(fullScale * BLOOM_FROM_SCALE).setAlpha(0).setVisible(true);
      this.scene.tweens.add({
        targets: this.picture,
        scale: fullScale,
        alpha: 1,
        duration: BLOOM_GROW_MS,
        ease: 'Back.easeOut',
      });
    }

    this.title.setText(title).setY(bottom + TITLE_GAP).setAlpha(0).setVisible(true);
    this.scene.tweens.add({ targets: this.title, alpha: 1, duration: BLOOM_GROW_MS });
  }

  fly(duration: number, hooks: FlightHooks): void {
    this.scene.tweens.add({
      targets: this.title,
      alpha: 0,
      duration: TITLE_FADE_MS,
      onComplete: () => this.title.setVisible(false),
    });

    if (!this.picture.visible) {
      hooks.onLanded();
      return;
    }

    const aspect = this.picture.displayHeight / this.picture.displayWidth;
    hooks.onReach();
    this.scene.tweens.add({
      targets: this.picture,
      x: this.landing.hand.x,
      y: this.landing.hand.y,
      duration,
      ease: 'Sine.easeInOut',
    });
    this.scene.tweens.add({
      targets: this.picture,
      displayWidth: FOUND_CAUGHT_WIDTH,
      displayHeight: FOUND_CAUGHT_WIDTH * aspect,
      duration,
      ease: 'Sine.easeInOut',
      onComplete: () => this.catchAndStow(aspect, hooks),
    });
  }

  private catchAndStow(aspect: number, hooks: FlightHooks): void {
    hooks.onCaught();

    this.scene.tweens.add({
      targets: this.picture,
      x: this.landing.purse.x,
      y: this.landing.purse.y,
      displayWidth: FOUND_LANDED_WIDTH,
      displayHeight: FOUND_LANDED_WIDTH * aspect,
      delay: FOUND_CAUGHT_HOLD_MS,
      duration: FOUND_DROP_MS,
      ease: 'Sine.easeIn',
      onComplete: () => {
        hooks.onLanded();
        this.scene.tweens.add({
          targets: this.picture,
          alpha: 0,
          duration: FOUND_LAND_FADE_MS,
          onComplete: () => this.picture.setVisible(false),
        });
      },
    });
  }

  reset(): void {
    this.scene.tweens.killTweensOf([this.cover, this.picture, this.title]);
    this.cover.setVisible(false);
    this.picture.setVisible(false);
    this.title.setVisible(false);
  }
}
