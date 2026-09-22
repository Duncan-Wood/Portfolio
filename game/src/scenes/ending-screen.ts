import { CRASHED, CRASH_LINE } from '../crash';
import {
  CONNECTION_LOST,
  REACH_OUT_LINE,
  RECOVERED_LINE,
  SHADOW_CLOSING_LINE,
  STILL_CONNECTED,
} from '../shadow-voice';

const TITLE_OFFSET = -18;
const LINE_OFFSET = 34;
const CONTACT_OFFER_OFFSET = 84;
const HINT_ALONE_OFFSET = 84;
const HINT_BELOW_OFFER_OFFSET = 132;
const CHAIN_NOTE_OFFSET = 172;

export interface EndingArea {
  centerX: number;
  centerY: number;
  textWidth: number;
}

export class EndingScreen {
  readonly contactOffer: Phaser.GameObjects.Text;

  private readonly scene: Phaser.Scene;
  private readonly centerY: number;

  private readonly title: Phaser.GameObjects.Text;
  private readonly line: Phaser.GameObjects.Text;
  private readonly hint: Phaser.GameObjects.Text;
  private readonly chainNote: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, area: EndingArea, restartPrompt: string) {
    this.scene = scene;
    this.centerY = area.centerY;

    this.hint = scene.add.text(
      area.centerX,
      area.centerY + HINT_ALONE_OFFSET,
      restartPrompt,
      {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#8ea3b0',
        backgroundColor: '#221038',
        padding: { x: 10, y: 5 },
      },
    ).setOrigin(0.5, 0.5).setVisible(false);

    this.chainNote = scene.add.text(
      area.centerX,
      area.centerY + CHAIN_NOTE_OFFSET,
      '',
      {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#ffc914',
        backgroundColor: '#221038',
        padding: { x: 10, y: 5 },
      },
    ).setOrigin(0.5, 0.5).setVisible(false);

    this.contactOffer = scene.add.text(
      area.centerX,
      area.centerY + CONTACT_OFFER_OFFSET,
      REACH_OUT_LINE,
      {
        fontFamily: 'monospace',
        fontSize: '19px',
        color: '#221038',
        backgroundColor: '#c98cff',
        padding: { x: 18, y: 10 },
      },
    )
      .setOrigin(0.5, 0.5)
      .setVisible(false)
      .setInteractive({ useHandCursor: true });

    this.title = scene.add.text(
      area.centerX,
      area.centerY + TITLE_OFFSET,
      CONNECTION_LOST,
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
      SHADOW_CLOSING_LINE,
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

  showLost(closingLine: string, bestChain: number): void {
    this.line.setText(closingLine);
    this.hint.setY(this.centerY + HINT_ALONE_OFFSET);

    this.fadeIn([this.title, this.line, this.hint, ...this.chainNoteIfEarned(bestChain)]);
  }

  showWon(bestChain: number): void {
    this.hint.setY(this.centerY + HINT_BELOW_OFFER_OFFSET);
    this.title.setText(STILL_CONNECTED);
    this.line.setText(RECOVERED_LINE);

    this.fadeIn([
      this.title, this.line, this.hint, this.contactOffer,
      ...this.chainNoteIfEarned(bestChain),
    ]);
  }

  showCrash(): void {
    this.title.setText(CRASHED).setVisible(true).setAlpha(1);
    this.line.setText(CRASH_LINE).setVisible(true).setAlpha(1);
    this.hint.setY(this.centerY + HINT_ALONE_OFFSET).setVisible(true).setAlpha(1);
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

  reset(): void {
    this.scene.tweens.killTweensOf(this.all());
    this.hide();
  }

  private chainNoteIfEarned(bestChain: number): Phaser.GameObjects.Text[] {
    if (bestChain < 2) {
      return [];
    }

    this.chainNote.setText(`BEST CHAIN  ${bestChain}`);
    return [this.chainNote];
  }

  private fadeIn(texts: Phaser.GameObjects.Text[]): void {
    for (const text of texts) {
      text.setVisible(true).setAlpha(0);
      this.scene.tweens.add({ targets: text, alpha: 1, duration: 420 });
    }
  }

  private all(): Phaser.GameObjects.Text[] {
    return [this.title, this.line, this.hint, this.contactOffer, this.chainNote];
  }
}
