import { PIECE_TYPE_COUNT } from '../engine/grid';
import { MEMORY_ART, type MemoryGrid } from '../memory-art';
import { revealOrder } from '../memory-reveal';
import { PIECE_COLORS, mix } from '../palette';

const MEMORY_PICTURE_DARKEN = 0.88;
const MEMORY_PICTURE_FILL_MS = 620;

const FOUND_HOLD_MS = 3200;
const FOUND_FADE_MS = 500;
const FOUND_TITLE_GAP = 16;
const FOUND_HINT_GAP = 20;

export interface PanelBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export class MemoryPanel {
  private readonly scene: Phaser.Scene;
  private readonly box: PanelBox;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly foundTitle: Phaser.GameObjects.Text;
  private readonly foundHint: Phaser.GameObjects.Text;

  private rank: number[] = [];
  private art: MemoryGrid | null = null;
  private photo: string | null = null;
  private shownCells = 0;
  private shownProgress = -1;
  private fill: Phaser.Tweens.Tween | null = null;
  private showingFound = false;

  constructor(scene: Phaser.Scene, box: PanelBox) {
    this.scene = scene;
    this.box = box;
    this.graphics = scene.add.graphics();

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
    this.fill?.remove();
    this.fill = null;

    const art = this.choose(photo);
    if (art === null) {
      return;
    }

    this.shownCells = art.columns * art.rows.length;
    this.draw();
    this.showingFound = true;

    const below = this.pictureBottom(art) + FOUND_TITLE_GAP;
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
  }

  reset(): void {
    this.scene.tweens.killTweensOf([this.graphics, this.foundTitle, this.foundHint]);
    this.stopShowingFound();
    this.graphics.setAlpha(1);
    this.photo = null;
    this.shownCells = 0;
  }

  private stopShowingFound(): void {
    this.showingFound = false;
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

  private pictureBottom(art: MemoryGrid): number {
    return this.box.top + (this.box.height + this.cellSize(art) * art.rows.length) / 2;
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
