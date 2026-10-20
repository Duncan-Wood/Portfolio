import { BlendModes } from 'phaser';
import {
  CELL_SAMPLE,
  SKY_CELLS,
  SKY_HEIGHT,
  SKY_TRUNK,
  labelSpot,
  nearestTrunkSample,
  pictureFrameOf,
  placeOf,
  routeCovers,
  starOf,
  trunkLitAt,
  trunkWidth,
} from '../sky';
import {
  CELL_SATELLITES,
  SKY_TENDRILS,
  SKY_TWIGS,
  SPARK_GAP,
  SPARK_REACH,
  advanceSparks,
  ambientPulseAt,
  seededRandom,
  sparkSample,
  spawnSparks,
  standingAt,
  trunkLift,
  walkAfter,
  type Spark,
  type Walker,
} from '../sky-life';
import { STAR_TITLE_Y } from '../victory-layout';
import { STAR_TEXTURE, bakeSkyPicture, skyPictureTexture } from './tile-textures';
import { collectionEntries } from '../memories';
import { MEMORY_PICTURES } from '../memory-pictures';
import { characterTexture } from './character-textures';
import { type FoundEntry } from './found-memories';

const SELECTED_LIFT = 1.25;
const STAR_SCALE = 0.55;
const DIMMED = 0.55;
const DIMMED_TINT = 0xd7c4ff;
const HOVER_REACH = 34;

const PICTURE_ALPHA = 0.34;
const PICTURE_EASE = 0.008;
const TRUNK_GLOW = 0x965ae6;
const TRUNK_CORE = 0xe1c8ff;
const CELL_GLOW = 0xc98cff;
const CHUNK = 7;
const GLOW_RINGS = [1, 0.82, 0.64, 0.46, 0.3, 0.16];
const GLOW_RING_ALPHA = 0.045;
const PLACE_COLORS: Readonly<Record<string, string>> = {
  'THE DMV': '#6f9bff',
  FLORIDA: '#5fd0a0',
  ILLINOIS: '#e0b060',
};

const DUST_COUNT = 110;
const DUST_SEED = 1987;
const AMBIENT_LIGHTS = 3;

const FIGURE_SCALE = 0.15;
const FIGURE_FEET = 60 / 64;
const STRIDE_BOB = 2.5;
const STRIDE_RATE = 0.016;
const IDLE_BOB = 0.6;
const IDLE_RATE = 0.002;

export class VictorySky {
  readonly pictures: (Phaser.GameObjects.Image | null)[];

  private readonly entries: readonly FoundEntry[];
  private readonly dust: Phaser.GameObjects.Graphics;
  private readonly backdrops: Phaser.GameObjects.Image[];
  private readonly web: Phaser.GameObjects.Graphics;
  private readonly live: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private readonly figure: Phaser.GameObjects.Image;
  private readonly title: Phaser.GameObjects.Text;

  private walker: Walker = standingAt(0);
  private shown: number[] = [];
  private selectedAt = 0;
  private pointer: { x: number; y: number } | null = null;
  private sparks: Spark[] = [];
  private lastSparkAt = Number.NEGATIVE_INFINITY;

  constructor(
    scene: Phaser.Scene,
    entries: readonly FoundEntry[],
    width: number,
  ) {
    this.entries = entries;

    this.dust = scene.add.graphics().setVisible(false);
    this.scatterDust(width);

    this.backdrops = entries.map((_, index) => {
      const photo = collectionEntries()[index].photo!;
      const frame = pictureFrameOf(index);
      bakeSkyPicture(scene, photo, MEMORY_PICTURES[photo]);

      return scene.add
        .image((frame.left + frame.right) / 2, (frame.top + frame.bottom) / 2, skyPictureTexture(photo))
        .setDisplaySize(frame.right - frame.left, frame.bottom - frame.top)
        .setAlpha(0)
        .setVisible(false);
    });

    this.web = scene.add.graphics().setVisible(false).setBlendMode(BlendModes.ADD);
    this.live = scene.add.graphics().setVisible(false).setBlendMode(BlendModes.ADD);

    this.label = scene.add.text(0, 0, '', { fontFamily: 'monospace', fontSize: '12px' })
      .setAlpha(0.8)
      .setVisible(false);

    this.figure = scene.add.image(0, 0, characterTexture('idle', 0))
      .setOrigin(0.5, FIGURE_FEET)
      .setScale(FIGURE_SCALE)
      .setTint(0x0a0512)
      .setVisible(false);

    this.pictures = SKY_CELLS.map((_, index) => scene.add
      .image(starOf(index).x, starOf(index).y, STAR_TEXTURE)
      .setVisible(false)
      .setInteractive({ useHandCursor: true }));

    // The scrim sits above the stars for input, so hovering has to be worked out here.
    scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.wasTouch || pointer.isDown) {
        this.aim(pointer);
      }
    });
    scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.aim(pointer);
      this.lastSparkAt = Number.NEGATIVE_INFINITY;
    });
    scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (pointer.wasTouch) {
        this.pointer = null;
      }
    });
    scene.input.on('gameout', () => {
      this.pointer = null;
    });

    this.title = scene.add.text(width / 2, STAR_TITLE_Y, '', {
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
    this.shown = [...indices].filter((index) => SKY_CELLS[index] !== undefined).sort((a, b) => a - b);

    this.dust.setVisible(true);

    if (this.shown.length === 0) {
      return;
    }

    for (const index of this.shown) {
      this.pictures[index]!.setVisible(true);
      this.backdrops[index].setVisible(true);
    }
    this.web.setVisible(true);
    this.live.setVisible(true);
    this.figure.setVisible(true);

    const at = select === undefined ? -1 : this.shown.indexOf(select);
    this.selectedAt = at === -1 ? this.shown.length - 1 : at;
    this.highlight();
    this.walker = standingAt(CELL_SAMPLE[this.selected]);
    this.placeFigure(0);
  }

  tick(time: number, delta: number): void {
    if (!this.showing) {
      return;
    }

    const elapsed = Math.min(50, delta);
    this.sendSparks(time);
    this.sparks = advanceSparks(this.sparks, elapsed);

    for (const index of this.shown) {
      const target = index === this.selected ? PICTURE_ALPHA : 0;
      const backdrop = this.backdrops[index];
      backdrop.setAlpha(backdrop.alpha + (target - backdrop.alpha) * Math.min(1, elapsed * PICTURE_EASE));
    }

    this.walker = walkAfter(this.walker, CELL_SAMPLE[this.selected], elapsed, (sample) => trunkLitAt(this.shown, sample));
    this.placeFigure(time);
    this.drawLive(time);
  }

  private placeFigure(time: number): void {
    const sample = SKY_TRUNK[Math.round(this.walker.at)];
    const bob = this.walker.walking
      ? -Math.abs(Math.sin(time * STRIDE_RATE)) * STRIDE_BOB
      : -Math.sin(time * IDLE_RATE) * IDLE_BOB;

    this.figure.setPosition(sample.x, sample.y + bob).setFlipX(this.walker.facing === -1);
  }

  private aim(pointer: Phaser.Input.Pointer): void {
    this.pointer = { x: pointer.x, y: pointer.y };
    this.reachFor(pointer.x, pointer.y);
  }

  private sendSparks(time: number): void {
    if (this.pointer === null || time - this.lastSparkAt < SPARK_GAP) {
      return;
    }

    const at = nearestTrunkSample(this.pointer, SPARK_REACH);
    if (at === -1 || !routeCovers(this.shown, SKY_TRUNK[at].along)) {
      return;
    }

    this.lastSparkAt = time;
    this.sparks.push(...spawnSparks(at));
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
    this.backdrops.forEach((backdrop) => backdrop.setVisible(false).setAlpha(0));
    this.dust.setVisible(false);
    this.web.clear().setVisible(false);
    this.live.clear().setVisible(false);
    this.label.setVisible(false);
    this.figure.setVisible(false);
    this.title.setVisible(false);
    this.shown = [];
    this.sparks = [];
  }

  private scatterDust(width: number): void {
    const next = seededRandom(DUST_SEED);

    for (let drawn = 0; drawn < DUST_COUNT; drawn += 1) {
      const x = next() * width;
      const y = next() * SKY_HEIGHT;
      const size = next() < 0.85 ? 1 : 2;

      this.dust.fillStyle(0xffffff, 0.08 + next() * 0.22);
      this.dust.fillRect(x, y, size, size);
    }
  }

  private drawWeb(): void {
    this.web.clear();

    const lit = (along: number): boolean => routeCovers(this.shown, along);
    const nearSelected = (along: number): boolean => Math.abs(along - this.selected) < 1;

    for (let from = 0; from < SKY_TRUNK.length - 1; from += CHUNK) {
      const chunk = SKY_TRUNK.slice(from, Math.min(SKY_TRUNK.length, from + CHUNK + 1));
      const middle = chunk[Math.floor(chunk.length / 2)];
      if (!lit(middle.along)) {
        continue;
      }

      const width = trunkWidth(middle.along);
      const near = nearSelected(middle.along);

      for (const [stroke, color, alpha] of [
        [width * 3.2, TRUNK_GLOW, near ? 0.28 : 0.16],
        [width, TRUNK_CORE, near ? 0.9 : 0.55],
      ] as const) {
        this.web.lineStyle(stroke, color, alpha);
        this.web.beginPath();
        chunk.forEach(({ x, y }, at) => (at === 0 ? this.web.moveTo(x, y) : this.web.lineTo(x, y)));
        this.web.strokePath();
      }
    }

    for (const twig of SKY_TWIGS) {
      if (!lit(twig.along)) {
        continue;
      }

      this.web.lineStyle(twig.depth === 0 ? 1.1 : 0.8, 0xc996ff, twig.depth === 0 ? 0.3 : 0.2);
      this.web.beginPath();
      twig.points.forEach(([x, y], at) => (at === 0 ? this.web.moveTo(x, y) : this.web.lineTo(x, y)));
      this.web.strokePath();

      const [endX, endY] = twig.points[twig.points.length - 1];
      this.web.fillStyle(0xebdcff, 0.55);
      this.web.fillCircle(endX, endY, 1.2);
    }

    for (const index of this.shown) {
      const { x, y } = starOf(index);
      const chosen = index === this.selected;

      CELL_SATELLITES[index].forEach(({ dx, dy }, at) => {
        this.web.lineStyle(0.9, 0xd7b4ff, chosen ? 0.6 : 0.3);
        this.web.beginPath();
        this.web.moveTo(x, y);
        this.web.lineTo(x + dx, y + dy + (at % 2 === 0 ? 3 : -3));
        this.web.strokePath();
        this.web.fillStyle(0xf0e6ff, chosen ? 0.95 : 0.6);
        this.web.fillCircle(x + dx, y + dy, chosen ? 2.1 : 1.5);
      });
    }
  }

  private drawTendrils(time: number): void {
    if (!this.shown.includes(0)) {
      return;
    }

    for (const points of SKY_TENDRILS) {
      for (let at = 0; at < points.length - 1; at += 1) {
        const fade = 1 - at / points.length;
        this.live.lineStyle(1.6 * fade + 0.4, TRUNK_CORE, 0.55 * fade);
        this.live.beginPath();
        this.live.moveTo(points[at][0], points[at][1]);
        this.live.lineTo(points[at + 1][0], points[at + 1][1]);
        this.live.strokePath();
      }

      const [tipX, tipY] = points[points.length - 1];
      const shimmer = 0.5 + 0.5 * Math.sin(time * 0.003 + tipX);
      this.live.fillStyle(0xffffff, 0.25 + 0.4 * shimmer);
      this.live.fillCircle(tipX, tipY, 1.6);
    }
  }

  private glow(x: number, y: number, radius: number, strength: number): void {
    for (const reach of GLOW_RINGS) {
      this.live.fillStyle(CELL_GLOW, strength * GLOW_RING_ALPHA);
      this.live.fillCircle(x, y, radius * reach);
    }
  }

  private drawLive(time: number): void {
    this.live.clear();

    if (this.pointer !== null) {
      for (let at = 0; at < SKY_TRUNK.length - 1; at += 1) {
        const sample = SKY_TRUNK[at];
        const lift = trunkLift(sample, this.pointer);
        if (lift > 0.02 && routeCovers(this.shown, sample.along)) {
          const next = SKY_TRUNK[at + 1];
          this.live.lineStyle(trunkWidth(sample.along) * (1 + lift * 0.15), TRUNK_CORE, lift * 0.15);
          this.live.beginPath();
          this.live.moveTo(sample.x, sample.y);
          this.live.lineTo(next.x, next.y);
          this.live.strokePath();
        }
      }
    }

    this.drawTendrils(time);

    for (let light = 0; light < AMBIENT_LIGHTS; light += 1) {
      const sample = SKY_TRUNK[ambientPulseAt(time, light, AMBIENT_LIGHTS)];
      if (routeCovers(this.shown, sample.along)) {
        this.glow(sample.x, sample.y, 9, 2.4);
      }
    }

    for (const spark of this.sparks) {
      const sample = sparkSample(spark);
      this.glow(sample.x, sample.y, 5 + 2 * spark.life, spark.life * 1.6);
    }

    for (const index of this.shown) {
      const { x, y } = starOf(index);
      const chosen = index === this.selected;
      const breath = 1 + 0.05 * Math.sin(time * 0.0022 + index);

      this.glow(x, y, (chosen ? 38 : 24) * breath, chosen ? 1.6 : 0.9);
      this.live.fillStyle(0xffffff, 1);
      this.live.fillCircle(x, y, (chosen ? 5 : 3.6) * breath);
    }
  }

  private highlight(): void {
    for (const index of this.shown) {
      const chosen = index === this.selected;

      this.pictures[index]!
        .setScale((chosen ? SELECTED_LIFT : 1) * STAR_SCALE)
        .setAlpha(chosen ? 1 : DIMMED)
        .setTint(chosen ? 0xffffff : DIMMED_TINT);
    }

    const place = placeOf(this.selected);
    this.label.setText(place).setColor(PLACE_COLORS[place]).setVisible(true);
    const spot = labelSpot(this.selected, this.label.width);
    this.label.setPosition(spot.left, spot.top);

    this.title.setText(this.entries[this.selected].title).setVisible(true);
    this.drawWeb();
  }
}
