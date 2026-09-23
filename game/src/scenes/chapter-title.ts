const FADE_MS = 620;
const HOLD_MS = 1500;

export class ChapterTitle {
  private readonly scene: Phaser.Scene;
  private readonly text: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;

    this.text = scene.add.text(x, y, '', {
      fontFamily: 'monospace',
      fontSize: '30px',
      color: '#e8eef2',
      backgroundColor: '#221038',
      padding: { x: 18, y: 12 },
    }).setOrigin(0.5, 0.5).setVisible(false);
  }

  announce(title: string): void {
    this.reset();

    this.text.setText(title).setVisible(true).setAlpha(0);
    this.scene.tweens.add({
      targets: this.text,
      alpha: 1,
      duration: FADE_MS,
      hold: HOLD_MS,
      yoyo: true,
      onComplete: () => this.text.setVisible(false),
    });
  }

  reset(): void {
    this.scene.tweens.killTweensOf(this.text);
    this.text.setVisible(false);
  }
}
