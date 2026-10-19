import { litRoute, starOf } from '../sky';
import { SKY_MEMORIES, SKY_REGIONS } from '../sky-layout';
import { STAR_COLOR, TRACK_LIT_COLOR, mix } from '../palette';
import { STAR_TEXTURE } from './tile-textures';
import { characterTexture } from './character-textures';
import { type FoundEntry } from './found-memories';

const SELECTED_LIFT = 1.25;
const DIMMED = 0.55;
const HOVER_REACH = 34;

const NEURON_SCALE = 0.72;
const NEURON_COLOR = 0xf0e1ff;
const GLOW_COLOR = 0xc98cff;
const DISTRICT = 'District of Columbia';
const VIRGINIA = 'Virginia';

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

const rgbNumber = ([red, green, blue]: readonly [number, number, number]): number => (red << 16) | (green << 8) | blue;

const rgbString = (tint: readonly [number, number, number]): string => `#${rgbNumber(tint).toString(16).padStart(6, '0')}`;

export class VictorySky {
  readonly pictures: (Phaser.GameObjects.Image | null)[];

  private readonly entries: readonly FoundEntry[];
  private readonly dust: Phaser.GameObjects.Graphics;
  private readonly map: Phaser.GameObjects.Graphics;
  private readonly labels: Phaser.GameObjects.Text[];
  private readonly lines: Phaser.GameObjects.Graphics;
  private readonly neurons: Phaser.GameObjects.Graphics;
  private readonly rail: Phaser.GameObjects.Graphics;
  private readonly figure: Phaser.GameObjects.Image;
  private readonly title: Phaser.GameObjects.Text;

  private readonly frame: SkyFrame;
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
    this.frame = frame;

    this.dust = scene.add.graphics().setVisible(false);
    this.scatterDust(width, groundY);

    this.map = scene.add.graphics().setVisible(false);
    this.drawMap();
    this.labels = SKY_REGIONS.map((region) => scene.add
      .text(frame.left + region.label.x * frame.width, frame.top + region.label.y * frame.height, region.name, {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: rgbString(region.tint),
      })
      .setAlpha(0.6)
      .setVisible(false));

    this.lines = scene.add.graphics().setVisible(false);
    this.neurons = scene.add.graphics().setVisible(false);

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

    this.pictures = SKY_MEMORIES.map((_, index) => scene.add
      .image(
        frame.left + starOf(index).x * frame.width,
        frame.top + starOf(index).y * frame.height,
        STAR_TEXTURE,
      )
      .setVisible(false)
      .setInteractive({ useHandCursor: true }));

    // The scrim sits above the stars for input, so hovering has to be worked out here.
    scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.reachFor(pointer.x, pointer.y);
    });

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
    this.shown = [...indices].filter((index) => SKY_MEMORIES[index] !== undefined).sort((a, b) => a - b);

    this.dust.setVisible(true);
    this.map.setVisible(true);
    this.labels.forEach((label) => label.setVisible(true));
    this.rail.setVisible(true);
    this.figure.setVisible(true);

    if (this.shown.length === 0) {
      return;
    }

    for (const index of this.shown) {
      this.pictures[index]!.setVisible(true);
    }

    this.drawLines();
    this.drawNeurons();

    const at = select === undefined ? -1 : this.shown.indexOf(select);
    this.selectedAt = at === -1 ? this.shown.length - 1 : at;
    this.highlight();
  }

  private reachFor(x: number, y: number): void {
    if (!this.showing) {
      return;
    }

    let nearest = -1;
    let closest = HOVER_REACH;

    for (const index of this.shown) {
      const star = this.pictures[index]!;
      const distance = Math.hypot(star.x - x, star.y - y);
      if (distance < closest) {
        closest = distance;
        nearest = index;
      }
    }

    if (nearest !== -1) {
      this.pointAt(nearest);
    }
  }

  private pointAt(index: number): void {
    const at = this.shown.indexOf(index);
    if (at === -1 || at === this.selectedAt) {
      return;
    }

    this.selectedAt = at;
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
    this.map.setVisible(false);
    this.labels.forEach((label) => label.setVisible(false));
    this.lines.setVisible(false);
    this.neurons.setVisible(false);
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

  private place(point: { x: number; y: number }): { x: number; y: number } {
    return {
      x: this.frame.left + point.x * this.frame.width,
      y: this.frame.top + point.y * this.frame.height,
    };
  }

  private drawMap(): void {
    for (const region of SKY_REGIONS) {
      const tint = rgbNumber(region.tint);

      for (const ring of region.rings) {
        const district = ring.state === DISTRICT;
        const points = ring.points.map(([x, y]) => this.place({ x, y }));

        const faded = ring.state === VIRGINIA;

        this.map.fillStyle(tint, district ? 0.25 : faded ? 0 : 0.07);
        this.map.lineStyle(1.3, district ? 0xa0c8ff : tint, district ? 0.95 : faded ? 0.14 : 0.36);
        this.map.beginPath();
        points.forEach(({ x, y }, at) => (at === 0 ? this.map.moveTo(x, y) : this.map.lineTo(x, y)));
        this.map.closePath();
        this.map.fillPath();
        this.map.strokePath();
      }
    }
  }

  private drawLines(): void {
    this.lines.clear().setVisible(true);

    this.lines.lineStyle(1, mix(TRACK_LIT_COLOR, 0x000000, 0.35), 0.5);
    for (const index of this.shown) {
      const { neurons, links } = SKY_MEMORIES[index];

      for (const [from, to] of links) {
        const start = this.place(neurons[from]);
        const end = this.place(neurons[to]);
        this.lines.beginPath();
        this.lines.moveTo(start.x, start.y);
        this.lines.lineTo(end.x, end.y);
        this.lines.strokePath();
      }
    }

    for (const [from, to] of litRoute(this.shown)) {
      const start = this.pictures[from]!;
      const end = this.pictures[to]!;

      this.lines.beginPath();
      this.lines.moveTo(start.x, start.y);
      this.lines.lineTo(end.x, end.y);
      this.lines.strokePath();
    }
  }

  private drawNeurons(): void {
    this.neurons.clear().setVisible(true);

    for (const index of this.shown) {
      for (const neuron of SKY_MEMORIES[index].neurons) {
        const { x, y } = this.place(neuron);
        const radius = (3 + neuron.size * 5) * NEURON_SCALE;

        this.neurons.fillStyle(GLOW_COLOR, 0.12);
        this.neurons.fillCircle(x, y, radius * 2.4);
        this.neurons.fillStyle(GLOW_COLOR, 0.2);
        this.neurons.fillCircle(x, y, radius * 1.5);
        this.neurons.lineStyle(1.2, NEURON_COLOR, 0.95);
        this.neurons.strokeCircle(x, y, radius);
        this.neurons.fillStyle(0xffffff, 1);
        this.neurons.fillCircle(x, y, radius * 0.38);
      }
    }
  }

  private highlight(): void {
    for (const index of this.shown) {
      const chosen = index === this.selected;
      const scale = 1;

      this.pictures[index]!
        .setScale(chosen ? scale * SELECTED_LIFT : scale)
        .setAlpha(chosen ? 1 : DIMMED)
        .setTint(chosen ? 0xffffff : mix(STAR_COLOR, 0x000000, 0.1));
    }

    this.title.setText(this.entries[this.selected].title).setVisible(true);
  }
}
