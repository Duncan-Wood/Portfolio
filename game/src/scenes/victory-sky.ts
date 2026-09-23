import { SKY_POINTS, litEdges } from '../sky';
import { CHRYSALIS_COLOR, TRACK_LIT_COLOR, mix } from '../palette';
import { STAR_TEXTURE } from './tile-textures';
import { characterTexture } from './character-textures';
import { type FoundEntry } from './found-memories';

const BRIGHT_SCALE = 1;
const FAINT_SCALE = 0.62;
const SELECTED_LIFT = 1.25;
const DIMMED = 0.55;

const DUST_COUNT = 110;
const DUST_SEED = 1987;

const RAIL_HEIGHT = 5;
const FIGURE_X = 108;
const FIGURE_SCALE = 0.62;

export interface SkyFrame {
  left: number;
  top: number;
  width: number;
  height: number;
}

export class VictorySky {
  readonly pictures: (Phaser.GameObjects.Image | null)[];

  private readonly entries: readonly FoundEntry[];
  private readonly dust: Phaser.GameObjects.Graphics;
  private readonly lines: Phaser.GameObjects.Graphics;
  private readonly rail: Phaser.GameObjects.Graphics;
  private readonly figure: Phaser.GameObjects.Image;
  private readonly title: Phaser.GameObjects.Text;

  private shown: number[] = [];
  private selectedAt = 0;

  constructor(
    scene: Phaser.Scene,
    entries: readonly FoundEntry[],
    frame: SkyFrame,
    titleY: number,
    groundY: number,
    width: number,
  ) {
    this.entries = entries;

    this.dust = scene.add.graphics().setVisible(false);
    this.scatterDust(width, groundY);

    this.lines = scene.add.graphics().setVisible(false);

    this.rail = scene.add.graphics().setVisible(false);
    this.rail.fillStyle(0x0a0512, 1);
    this.rail.fillRect(0, groundY, width, RAIL_HEIGHT);
    this.rail.fillStyle(0x140a24, 1);
    this.rail.fillRect(0, groundY + RAIL_HEIGHT, width, Math.max(0, 900 - groundY));

    this.figure = scene.add.image(FIGURE_X, groundY, characterTexture('idle', 0))
      .setOrigin(0.5, 1)
      .setScale(FIGURE_SCALE)
      .setTint(0x0a0512)
      .setVisible(false);

    this.pictures = SKY_POINTS.map((point) => scene.add
      .image(
        frame.left + point.x * frame.width,
        frame.top + point.y * frame.height,
        STAR_TEXTURE,
      )
      .setVisible(false)
      .setInteractive({ useHandCursor: true }));

    this.title = scene.add.text(width / 2, titleY, '', {
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
    this.shown = [...indices].filter((index) => SKY_POINTS[index] !== undefined).sort((a, b) => a - b);

    this.dust.setVisible(true);
    this.rail.setVisible(true);
    this.figure.setVisible(true);

    if (this.shown.length === 0) {
      return;
    }

    for (const index of this.shown) {
      this.pictures[index]!.setVisible(true);
    }

    this.drawLines();

    const at = select === undefined ? -1 : this.shown.indexOf(select);
    this.selectedAt = at === -1 ? this.shown.length - 1 : at;
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
    for (const star of this.pictures) {
      star?.setVisible(false);
    }
    this.dust.setVisible(false);
    this.lines.setVisible(false);
    this.rail.setVisible(false);
    this.figure.setVisible(false);
    this.title.setVisible(false);
    this.shown = [];
  }

  private scatterDust(width: number, groundY: number): void {
    let seed = DUST_SEED;
    const next = (): number => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };

    for (let drawn = 0; drawn < DUST_COUNT; drawn += 1) {
      const x = next() * width;
      const y = next() * groundY;
      const size = next() < 0.85 ? 1 : 2;

      this.dust.fillStyle(0xffffff, 0.08 + next() * 0.22);
      this.dust.fillRect(x, y, size, size);
    }
  }

  private drawLines(): void {
    this.lines.clear().setVisible(true);

    for (const [from, to] of litEdges(this.shown)) {
      const start = this.pictures[from]!;
      const end = this.pictures[to]!;

      this.lines.lineStyle(1, mix(TRACK_LIT_COLOR, 0x000000, 0.35), 0.5);
      this.lines.beginPath();
      this.lines.moveTo(start.x, start.y);
      this.lines.lineTo(end.x, end.y);
      this.lines.strokePath();
    }
  }

  private highlight(): void {
    for (const index of this.shown) {
      const chosen = index === this.selected;
      const scale = SKY_POINTS[index].bright ? BRIGHT_SCALE : FAINT_SCALE;

      this.pictures[index]!
        .setScale(chosen ? scale * SELECTED_LIFT : scale)
        .setAlpha(chosen ? 1 : DIMMED)
        .setTint(chosen ? 0xffffff : mix(CHRYSALIS_COLOR, 0x000000, 0.1));
    }

    this.title.setText(this.entries[this.selected].title).setVisible(true);
  }
}
