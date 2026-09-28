import { PIECE_TYPE_COUNT } from '../engine/grid';
import { TRACE_TEXTURE, memoryArtTexture } from './tile-textures';
import { MEMORY_ART, type MemoryGrid } from '../memory-art';
import { revealOrder } from '../memory-reveal';
import { PIECE_COLORS, mix } from '../palette';

const MEMORY_PICTURE_DARKEN = 0.88;
const MEMORY_PICTURE_FILL_MS = 620;

const FOUND_FLIGHT_DELAY = 900;
const FOUND_CROSSFADE_MS = 140;
const FOUND_LIFT_MS = 300;
const FOUND_LIFT_RISE = 18;
const FOUND_FLIGHT_MS = 900;
const FOUND_HELD_MS = 600;
const FOUND_LAND_FADE_MS = 220;
const FOUND_LANDED_WIDTH = 18;

export const FOUND_FLIGHT_END_MS = FOUND_FLIGHT_DELAY + FOUND_CROSSFADE_MS + FOUND_LIFT_MS
  + FOUND_FLIGHT_MS + FOUND_HELD_MS + FOUND_LAND_FADE_MS;

const FOUND_HOLD_MS = 3200;
const FOUND_FADE_MS = 500;
const FOUND_TITLE_ABOVE_BOTTOM = 34;
const FOUND_HINT_GAP = 22;

export interface PanelBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface FlightTarget {
  x: number;
  y: number;
}

export class MemoryPanel {
  private readonly scene: Phaser.Scene;
  private readonly box: PanelBox;
  private readonly flyTo: FlightTarget;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly flier: Phaser.GameObjects.Image;
  private readonly foundTitle: Phaser.GameObjects.Text;
  private readonly foundHint: Phaser.GameObjects.Text;

  private rank: number[] = [];
  private art: MemoryGrid | null = null;
  private photo: string | null = null;
  private shownCells = 0;
  private shownProgress = -1;
  private fill: Phaser.Tweens.Tween | null = null;
  private showingFound = false;

  constructor(scene: Phaser.Scene, box: PanelBox, flyTo: FlightTarget) {
    this.scene = scene;
    this.box = box;
    this.flyTo = flyTo;
    this.graphics = scene.add.graphics();
    this.flier = scene.add.image(0, 0, TRACE_TEXTURE).setVisible(false);

    const centerX = box.left + box.width / 2;
    this.foundTitle = scene.add.text(centerX, 0, '', {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: '#c98cff',
      align: 'center',
      wordWrap: { width: box.width },
    }).setOrigin(0.5, 0).setVisible(false);
    this.foundHint = scene.add.text(centerX, 0, '', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#9481aa',
    }).setOrigin(0.5, 0).setVisible(false);
  }

  showProgress(photo: string | undefined, progress: number): void {
    if (this.showingFound || progress === this.shownProgress) {
      return;
    }

    this.shownProgress = progress;
    this.fillTo(photo, progress);
  }

  startOver(photo: string | undefined): void {
    this.shownProgress = -1;
    this.fillTo(photo, 0);
  }

  fadeTo(alpha: number, duration: number, delay = 0): void {
    if (this.showingFound) {
      this.scene.tweens.killTweensOf([this.graphics, this.foundTitle, this.foundHint]);
      this.stopShowingFound();
      this.graphics.setAlpha(1);
    }

    this.scene.tweens.add({ targets: this.graphics, alpha, duration, delay });
  }

  showFound(photo: string | undefined, title: string, hint: string | null): void {
    this.present(photo, title, hint);
  }

  showFoundFlying(
    photo: string | undefined,
    title: string,
    hint: string | null,
    onLanded: () => void,
  ): void {
    const art = this.present(photo, title, hint);
    if (art !== null && photo !== undefined) {
      this.flyToTarget(art, photo, onLanded);
    }
  }

  private present(photo: string | undefined, title: string, hint: string | null): MemoryGrid | null {
    this.fill?.remove();
    this.fill = null;

    const art = this.choose(photo);
    if (art === null || photo === undefined) {
      return null;
    }

    this.shownCells = art.columns * art.rows.length;
    this.draw();
    this.showingFound = true;

    const below = this.box.top + this.box.height - FOUND_TITLE_ABOVE_BOTTOM;
    const shown = [this.foundTitle.setText(title).setY(below)];
    if (hint !== null) {
      shown.push(this.foundHint.setText(hint).setY(below + FOUND_HINT_GAP));
    }
    for (const text of shown) {
      text.setVisible(true).setAlpha(0);
    }

    this.scene.tweens.add({ targets: shown, alpha: 1, duration: FOUND_FADE_MS });
    this.scene.tweens.add({
      targets: [this.graphics, ...shown],
      alpha: 0,
      delay: FOUND_HOLD_MS,
      duration: FOUND_FADE_MS,
      onComplete: () => {
        this.stopShowingFound();
        this.scene.tweens.add({ targets: this.graphics, alpha: 1, duration: FOUND_FADE_MS });
      },
    });

    return art;
  }

  reset(): void {
    this.scene.tweens.killTweensOf([this.graphics, this.foundTitle, this.foundHint, this.flier]);
    this.stopShowingFound();
    this.graphics.setAlpha(1);
    this.photo = null;
    this.shownCells = 0;
  }

  private restInTheirHands(onLanded: () => void): void {
    this.scene.tweens.add({
      targets: this.flier,
      alpha: 0,
      delay: FOUND_HELD_MS,
      duration: FOUND_LAND_FADE_MS,
      onStart: onLanded,
      onComplete: () => this.flier.setVisible(false),
    });
  }

  private flyToTarget(art: MemoryGrid, photo: string, onLanded: () => void): void {
    const key = memoryArtTexture(photo);
    if (!this.scene.textures.exists(key)) {
      return;
    }

    const size = this.cellSize(art);
    const tall = size * art.rows.length;
    const wide = size * art.columns;

    this.flier
      .setTexture(key)
      .setPosition(this.box.left + this.box.width / 2, this.box.top + this.box.height / 2)
      .setDisplaySize(wide, tall)
      .setAlpha(0)
      .setVisible(true);

    this.scene.tweens.add({
      targets: this.flier,
      alpha: 1,
      delay: FOUND_FLIGHT_DELAY,
      duration: FOUND_CROSSFADE_MS,
    });
    this.scene.tweens.add({
      targets: this.graphics,
      alpha: 0,
      delay: FOUND_FLIGHT_DELAY,
      duration: FOUND_CROSSFADE_MS,
    });

    this.scene.tweens.add({
      targets: this.flier,
      y: `-=${FOUND_LIFT_RISE}`,
      delay: FOUND_FLIGHT_DELAY + FOUND_CROSSFADE_MS,
      duration: FOUND_LIFT_MS,
      ease: 'Sine.easeOut',
    });

    const flying = {
      delay: FOUND_FLIGHT_DELAY + FOUND_CROSSFADE_MS + FOUND_LIFT_MS,
      duration: FOUND_FLIGHT_MS,
    };
    this.scene.tweens.add({ targets: this.flier, x: this.flyTo.x, ease: 'Sine.easeInOut', ...flying });
    this.scene.tweens.add({
      targets: this.flier,
      y: this.flyTo.y,
      displayWidth: FOUND_LANDED_WIDTH,
      displayHeight: FOUND_LANDED_WIDTH * (tall / wide),
      ease: 'Sine.easeInOut',
      ...flying,
      onComplete: () => this.restInTheirHands(onLanded),
    });
  }

  private stopShowingFound(): void {
    this.showingFound = false;
    this.scene.tweens.killTweensOf(this.flier);
    this.flier.setVisible(false);
    this.foundTitle.setVisible(false);
    this.foundHint.setVisible(false);
    this.shownProgress = -1;
    this.graphics.clear();
  }

  private choose(photo: string | undefined): MemoryGrid | null {
    const upcoming = photo === undefined ? undefined : MEMORY_ART[photo];

    if (photo === undefined || upcoming === undefined) {
      this.art = null;
      this.photo = null;
      this.graphics.clear();
      return null;
    }

    const art = upcoming.panel;

    if (photo !== this.photo) {
      this.photo = photo;
      this.art = art;
      this.rank = [];
      revealOrder(art.columns, art.rows.length)
        .forEach((cell, rank) => { this.rank[cell] = rank; });
      this.shownCells = 0;
    }

    return art;
  }

  private fillTo(photo: string | undefined, progress: number): void {
    const art = this.choose(photo);
    if (art === null) {
      return;
    }

    const cells = art.columns * art.rows.length;
    const target = Math.round(Math.max(0, Math.min(progress, 1)) * cells);

    this.fill?.remove();
    this.fill = this.scene.tweens.addCounter({
      from: this.shownCells,
      to: target,
      duration: MEMORY_PICTURE_FILL_MS,
      ease: 'Cubic.easeOut',
      onUpdate: (tween) => {
        this.shownCells = tween.getValue() ?? target;
        this.draw();
      },
      onComplete: () => {
        this.shownCells = target;
        this.draw();
      },
    });

    this.draw();
  }

  private cellSize(art: MemoryGrid): number {
    return Math.min(this.box.width / art.columns, this.box.height / art.rows.length);
  }

  private draw(): void {
    const art = this.art;
    if (art === null) {
      return;
    }

    const size = this.cellSize(art);
    const left = this.box.left + (this.box.width - size * art.columns) / 2;
    const top = this.box.top + (this.box.height - size * art.rows.length) / 2;
    const reached = this.shownCells;

    this.graphics.clear();

    for (let row = 0; row < art.rows.length; row += 1) {
      const line = art.rows[row];
      for (let column = 0; column < art.columns; column += 1) {
        const mark = line[column];
        if (mark === undefined || mark === '.') {
          continue;
        }

        const code = Number(mark);
        if (!Number.isInteger(code) || code >= PIECE_TYPE_COUNT * 2) {
          continue;
        }

        const shaded = code >= PIECE_TYPE_COUNT;
        const colour = PIECE_COLORS[shaded ? code - PIECE_TYPE_COUNT : code];
        const face = shaded ? mix(colour, 0x000000, 0.62) : colour;
        const lit = this.rank[row * art.columns + column] < reached;

        this.graphics.fillStyle(lit ? face : mix(face, 0x000000, MEMORY_PICTURE_DARKEN), 1);
        this.graphics.fillRect(
          left + column * size,
          top + row * size,
          Math.max(1, size - 1),
          Math.max(1, size - 1),
        );
      }
    }
  }
}
