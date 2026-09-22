import { GROUND_COLOR } from '../palette';
import { REACH_OUT_LINE, RECOVERED_LINE, STILL_CONNECTED } from '../shadow-voice';
import { type FoundEntry, FoundMemories } from './found-memories';
import { PressTwiceButton } from './press-twice-button';

const TITLE_Y = 150;
const LINE_Y = 205;
const ROW_Y = 330;
const HINT_Y = 452;
const CONTACT_Y = 540;
const PLAY_AGAIN_Y = 612;
const RESET_Y = 684;
const TALLY_Y = 760;

export interface VictoryLabels {
  hint: string;
  reset: string;
  resetArmed: string;
}

export class VictoryScreen {
  readonly memories: FoundMemories;
  readonly contactButton: Phaser.GameObjects.Text;
  readonly playAgainButton: Phaser.GameObjects.Text;
  readonly resetButton: PressTwiceButton;

  private readonly scrim: Phaser.GameObjects.Rectangle;
  private readonly title: Phaser.GameObjects.Text;
  private readonly line: Phaser.GameObjects.Text;
  private readonly hint: Phaser.GameObjects.Text;
  private readonly tally: Phaser.GameObjects.Text;

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

    this.scrim = scene.add.rectangle(centerX, height / 2, width, height, GROUND_COLOR)
      .setVisible(false)
      .setInteractive();

    this.title = scene.add.text(centerX, TITLE_Y, STILL_CONNECTED, {
      fontFamily: 'monospace',
      fontSize: '40px',
      color: '#e8eef2',
    }).setOrigin(0.5, 0.5).setVisible(false);

    this.line = scene.add.text(centerX, LINE_Y, RECOVERED_LINE, {
      fontFamily: 'monospace',
      fontSize: '17px',
      color: '#b07dff',
    }).setOrigin(0.5, 0.5).setVisible(false);

    this.memories = new FoundMemories(scene, entries, centerX, ROW_Y);

    this.hint = scene.add.text(centerX, HINT_Y, labels.hint, {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: '#9481aa',
      align: 'center',
    }).setOrigin(0.5, 0.5).setVisible(false);

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

    this.tally = scene.add.text(centerX, TALLY_Y, '', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#9481aa',
    }).setOrigin(0.5, 0.5).setVisible(false);
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

  show(found: readonly number[], completions: number): void {
    this.isActive = true;
    this.found = found;
    this.scrim.setVisible(true);
    this.tally.setText(completions === 1 ? 'completed once' : `completed ${completions} times`);
    this.showContents();
  }

  showContents(select?: number): void {
    for (const part of [this.title, this.line, this.hint, this.contactButton, this.playAgainButton, this.tally]) {
      part.setVisible(true);
    }
    this.memories.show(this.found, select);
    this.resetButton.show();
  }

  hideContents(): void {
    for (const part of [this.title, this.line, this.hint, this.contactButton, this.playAgainButton, this.tally]) {
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
