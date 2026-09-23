import { BUTTERFLY_TEXTURE } from './tile-textures';

const RISE_MS = 1900;
const WOBBLE = 30;
const WOBBLE_MS = 620;
const FLAP_MS = 150;
const FADE_IN_MS = 260;
const FADE_OUT_MS = 700;
const TITLE_FADE_MS = 520;
const TITLE_HOLD_MS = 1500;

export class ButterflyFlight {
  private readonly scene: Phaser.Scene;
  private readonly sprite: Phaser.GameObjects.Image;
  private readonly title: Phaser.GameObjects.Text;
  private readonly topY: number;

  constructor(scene: Phaser.Scene, titleX: number, titleY: number, topY: number) {
    this.scene = scene;
    this.topY = topY;

    this.sprite = scene.add.image(0, 0, BUTTERFLY_TEXTURE).setVisible(false);

    this.title = scene.add.text(titleX, titleY, '', {
      fontFamily: 'monospace',
      fontSize: '19px',
      color: '#f2e2c4',
      backgroundColor: '#221038',
      padding: { x: 14, y: 8 },
    }).setOrigin(0.5, 0.5).setVisible(false);
  }

  release(x: number, y: number, title: string): void {
    this.reset();

    this.sprite.setPosition(x, y).setScale(0.55).setAlpha(0).setVisible(true);

    this.scene.tweens.add({ targets: this.sprite, alpha: 1, scale: 1.1, duration: FADE_IN_MS });

    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: 0.62,
      duration: FLAP_MS,
      yoyo: true,
      repeat: -1,
      delay: FADE_IN_MS,
    });

    this.scene.tweens.add({
      targets: this.sprite,
      x: x + WOBBLE,
      duration: WOBBLE_MS,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.scene.tweens.add({
      targets: this.sprite,
      y: this.topY,
      duration: RISE_MS,
      ease: 'Sine.easeIn',
      onComplete: () => {
        this.scene.tweens.killTweensOf(this.sprite);
        this.sprite.setVisible(false);
      },
    });

    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      duration: FADE_OUT_MS,
      delay: RISE_MS - FADE_OUT_MS,
    });

    this.title.setText(title).setVisible(true).setAlpha(0);
    this.scene.tweens.add({
      targets: this.title,
      alpha: 1,
      duration: TITLE_FADE_MS,
      delay: RISE_MS * 0.5,
      hold: TITLE_HOLD_MS,
      yoyo: true,
      onComplete: () => this.title.setVisible(false),
    });
  }

  reset(): void {
    this.scene.tweens.killTweensOf([this.sprite, this.title]);
    this.sprite.setVisible(false);
    this.title.setVisible(false);
  }
}
