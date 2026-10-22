import { CRASHED, CRASH_LINE } from '../crash';
import { CONNECTION_LOST } from '../shadow-voice';

const TITLE_OFFSET = -18;
const LINE_OFFSET = 34;
const HINT_OFFSET = 84;

export interface EndingArea {
  centerX: number;
  centerY: number;
  textWidth: number;
}

export class EndingScreen {
  private readonly scene: Phaser.Scene;

  private readonly title: Phaser.GameObjects.Text;
  private readonly line: Phaser.GameObjects.Text;
  private readonly hint: Phaser.GameObjects.Text;

  private shown: Phaser.GameObjects.Text[] = [];

  constructor(scene: Phaser.Scene, area: EndingArea, restartPrompt: string) {
    this.scene = scene;

    this.hint = scene.add.text(
      area.centerX,
      area.centerY + HINT_OFFSET,
      restartPrompt,
      {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#8ea3b0',
        backgroundColor: '#221038',
        padding: { x: 10, y: 5 },
      },
    ).setOrigin(0.5, 0.5).setVisible(false);

    this.title = scene.add.text(
      area.centerX,
      area.centerY + TITLE_OFFSET,
      '',
      {
        fontFamily: 'monospace',
        fontSize: '40px',
        color: '#e8eef2',
        backgroundColor: '#221038',
        padding: { x: 16, y: 10 },
      },
    ).setOrigin(0.5, 0.5).setVisible(false);

    this.line = scene.add.text(
      area.centerX,
      area.centerY + LINE_OFFSET,
      '',
      {
        fontFamily: 'monospace',
        fontSize: '17px',
        color: '#b07dff',
        backgroundColor: '#221038',
        padding: { x: 12, y: 6 },
        align: 'center',
        wordWrap: { width: area.textWidth - 24 },
      },
    ).setOrigin(0.5, 0.5).setVisible(false);
  }

  showLost(closingLine: string): void {
    this.title.setText(CONNECTION_LOST);
    this.line.setText(closingLine);

    this.fadeIn([this.title, this.line, this.hint]);
  }

  showCrash(): void {
    this.title.setText(CRASHED).setVisible(true).setAlpha(1);
    this.line.setText(CRASH_LINE).setVisible(true).setAlpha(1);
    this.hint.setVisible(true).setAlpha(1);
  }

  hideCrash(): void {
    this.title.setVisible(false);
    this.line.setVisible(false);
  }

  hide(): void {
    for (const text of this.all()) {
      text.setVisible(false);
    }
  }

  restore(): void {
    for (const text of this.shown) {
      text.setVisible(true);
    }
  }

  reset(): void {
    this.scene.tweens.killTweensOf(this.all());
    this.hide();
    this.shown = [];
  }

  private fadeIn(texts: Phaser.GameObjects.Text[]): void {
    this.shown = texts;
    for (const text of texts) {
      text.setVisible(true).setAlpha(0);
      this.scene.tweens.add({ targets: text, alpha: 1, duration: 420 });
    }
  }

  private all(): Phaser.GameObjects.Text[] {
    return [this.title, this.line, this.hint];
  }
}
