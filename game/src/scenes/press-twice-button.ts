const ARMED_WINDOW_MS = 3000;

const IDLE_COLOR = '#d8c8ee';
const IDLE_BACKGROUND = '#3a2159';
const ARMED_COLOR = '#221038';
const ARMED_BACKGROUND = '#e4572e';

export class PressTwiceButton {
  readonly text: Phaser.GameObjects.Text;

  private readonly label: string;
  private readonly armedLabel: string;
  private armedUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, label: string, armedLabel: string) {
    this.label = label;
    this.armedLabel = armedLabel;

    this.text = scene.add.text(x, y, label, {
      fontFamily: 'monospace',
      fontSize: '19px',
      padding: { x: 20, y: 12 },
    })
      .setOrigin(0.5, 0.5)
      .setVisible(false)
      .setInteractive({ useHandCursor: true });

    this.disarm();
  }

  show(): void {
    this.text.setVisible(true);
    this.disarm();
  }

  hide(): void {
    this.text.setVisible(false);
    this.disarm();
  }

  press(now: number): boolean {
    if (now <= this.armedUntil) {
      return true;
    }

    this.armedUntil = now + ARMED_WINDOW_MS;
    this.text.setText(this.armedLabel).setColor(ARMED_COLOR).setBackgroundColor(ARMED_BACKGROUND);
    return false;
  }

  expire(now: number): void {
    if (this.armedUntil > 0 && now > this.armedUntil) {
      this.disarm();
    }
  }

  private disarm(): void {
    this.armedUntil = 0;
    this.text.setText(this.label).setColor(IDLE_COLOR).setBackgroundColor(IDLE_BACKGROUND);
  }
}
