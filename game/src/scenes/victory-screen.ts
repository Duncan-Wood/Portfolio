import { Geom } from 'phaser';
import { REACH_OUT_LINE, RECOVERED_LINE, STILL_CONNECTED } from '../shadow-voice';
import { type FoundEntry } from './found-memories';
import { VictorySky } from './victory-sky';
import { CONTACT_Y, LINE_Y, PLAY_AGAIN_Y, RESET_Y, TITLE_Y } from '../victory-layout';
import { PressTwiceButton } from './press-twice-button';

const LINE_MARGIN = 54;
const NIGHT_TOP = 0x0b0518;
const NIGHT_HORIZON = 0x2a1440;

export interface VictoryLabels {
  reset: string;
  resetArmed: string;
}

export class VictoryScreen {
  readonly memories: VictorySky;
  readonly contactButton: Phaser.GameObjects.Text;
  readonly playAgainButton: Phaser.GameObjects.Text;
  readonly resetButton: PressTwiceButton;

  private readonly scrim: Phaser.GameObjects.Graphics;
  private readonly title: Phaser.GameObjects.Text;
  private readonly line: Phaser.GameObjects.Text;

  private isActive = false;
  private found: readonly number[] = [];

  constructor(
    scene: Phaser.Scene,
    entries: readonly FoundEntry[],
    width: number,
    height: number,
    labels: VictoryLabels,
  ) {
    const centerX = width / 2;

    this.scrim = scene.add.graphics().setVisible(false);
    this.scrim.fillGradientStyle(NIGHT_TOP, NIGHT_TOP, NIGHT_HORIZON, NIGHT_HORIZON, 1);
    this.scrim.fillRect(0, 0, width, height);
    this.scrim.setInteractive(
      new Geom.Rectangle(0, 0, width, height),
      Geom.Rectangle.Contains,
    );

    this.title = scene.add.text(centerX, TITLE_Y, STILL_CONNECTED, {
      fontFamily: 'monospace',
      fontSize: '40px',
      color: '#e8eef2',
    }).setOrigin(0.5, 0.5).setVisible(false);

    this.line = scene.add.text(centerX, LINE_Y, RECOVERED_LINE, {
      fontFamily: 'monospace',
      fontSize: '17px',
      color: '#b07dff',
      align: 'center',
      wordWrap: { width: width - LINE_MARGIN * 2 },
    }).setOrigin(0.5, 0).setVisible(false);

    this.memories = new VictorySky(scene, entries, width);

    this.contactButton = scene.add.text(centerX, CONTACT_Y, REACH_OUT_LINE, {
      fontFamily: 'monospace',
      fontSize: '19px',
      color: '#221038',
      backgroundColor: '#c98cff',
      padding: { x: 18, y: 10 },
    })
      .setOrigin(0.5, 0.5)
      .setVisible(false)
      .setInteractive({ useHandCursor: true });

    this.playAgainButton = scene.add.text(centerX, PLAY_AGAIN_Y, 'play again', {
      fontFamily: 'monospace',
      fontSize: '19px',
      color: '#d8c8ee',
      backgroundColor: '#3a2159',
      padding: { x: 20, y: 12 },
    })
      .setOrigin(0.5, 0.5)
      .setVisible(false)
      .setInteractive({ useHandCursor: true });

    this.resetButton = new PressTwiceButton(scene, centerX, RESET_Y, labels.reset, labels.resetArmed);
  }

  get active(): boolean {
    return this.isActive;
  }

  get pressables(): Phaser.GameObjects.GameObject[] {
    return [
      this.contactButton,
      this.playAgainButton,
      this.resetButton.text,
      ...this.memories.pictures.filter((picture) => picture !== null),
    ];
  }

  show(found: readonly number[]): void {
    this.isActive = true;
    this.found = found;
    this.scrim.setVisible(true);
    this.showContents();
  }

  showContents(select?: number): void {
    for (const part of [this.title, this.line, this.contactButton, this.playAgainButton]) {
      part.setVisible(true);
    }
    this.memories.show(this.found, select);
    this.resetButton.show();
  }

  hideContents(): void {
    for (const part of [this.title, this.line, this.contactButton, this.playAgainButton]) {
      part.setVisible(false);
    }
    this.memories.hide();
    this.resetButton.hide();
  }

  hide(): void {
    this.isActive = false;
    this.hideContents();
    this.scrim.setVisible(false);
  }
}
