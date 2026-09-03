import { Math as PhaserMath } from 'phaser';
import { MEMORY_ART, type MemoryArt } from '../memory-art';
import { MAX_SHADOW_STRENGTH, PIECE_TYPE_COUNT, isNeuron, isNeuronLit } from '../engine/grid';
import {
  EMPTY_COLOR,
  NEURON_LIT_COLOR,
  NEURON_COLOR,
  PIECE_COLORS,
  PIECE_SHAPES,
  SHADOW_BODY_COLOR,
  SHADOW_COLOR,
  SHADOW_EDGE_COLOR,
  SHADOW_EYE_COLOR,
  SHADOW_EYE_GLOW,
  TRACK_LIT_COLOR,
  mix,
  type PieceShape,
} from '../palette';

const EMPTY_TILE_TEXTURE = 'tile-empty';

export const TRACE_TEXTURE = 'trace';

const TRACE_OVERLAP = 11;

/**
 * A dim pair is baked into the body as well: this overlay is only drawn for a
 * settled shadow, so one in mid-fall would otherwise have no eyes.
 */
export const SHADOW_EYES_TEXTURE = 'shadow-eyes';

export function shadowBodyTexture(strength: number): string {
  return `shadow-body-${Math.min(Math.max(strength, 1), MAX_SHADOW_STRENGTH)}`;
}

const PIT_OPACITY = 0.8;

const HEAD_ROW = 0.5;
const HEAD_RADIUS = 0.19;
const EYE_SPREAD = 0.105;
const EYE_ROW = 0.48;
const EYE_WIDTH = 0.115;
const EYE_HEIGHT = 0.105;

const TILE_INSET = 2;

function tileCornerRadius(size: number): number {
  return Math.round(size * 0.18);
}

const NEURON_TEXTURE = 'neuron';
const NEURON_LIT_TEXTURE = 'neuron-lit';

export function tileTexture(pieceType: number | null): string {
  if (pieceType === null) {
    return EMPTY_TILE_TEXTURE;
  }

  if (isNeuron(pieceType)) {
    return isNeuronLit(pieceType) ? NEURON_LIT_TEXTURE : NEURON_TEXTURE;
  }
  return `tile-${pieceType}`;
}

function bakeNeuron(graphics: Phaser.GameObjects.Graphics, size: number, lit: boolean): void {
  const middle = size / 2;
  const inset = TILE_INSET;
  const span = size - inset * 2;
  const corner = tileCornerRadius(size);
  const ink = lit ? NEURON_LIT_COLOR : NEURON_COLOR;
  const run = Math.max(3, Math.round(size * 0.055));

  graphics.clear();

  graphics.fillStyle(mix(EMPTY_COLOR, 0x000000, 0.45), 1);
  graphics.fillRoundedRect(inset, inset, span, span, corner);

  if (lit) {
    for (const [radius, alpha] of [[0.42, 0.2], [0.26, 0.18]] as const) {
      graphics.fillStyle(SHADOW_EYE_GLOW, alpha);
      graphics.fillCircle(middle, middle, size * radius);
    }
  }

  graphics.fillStyle(ink, lit ? 1 : 0.85);
  for (const [x, y, w, h] of [
    [middle - run / 2, 0, run, size * 0.3],
    [middle - run / 2, size * 0.7, run, size * 0.3],
    [0, middle - run / 2, size * 0.3, run],
    [size * 0.7, middle - run / 2, size * 0.3, run],
  ] as const) {
    graphics.fillRect(x, y, w, h);
  }

  const ring = size * 0.2;
  graphics.lineStyle(run * 1.3, ink, 1);
  graphics.strokeCircle(middle, middle, ring);

  if (lit) {
    graphics.fillStyle(SHADOW_EYE_GLOW, 0.5);
    graphics.fillCircle(middle, middle, size * 0.14);
    graphics.fillStyle(SHADOW_EYE_COLOR, 1);
    graphics.fillCircle(middle, middle, size * 0.09);
  }

  graphics.lineStyle(3, ink, lit ? 1 : 0.9);
  graphics.strokeRoundedRect(inset, inset, span, span, corner);

  graphics.generateTexture(lit ? NEURON_LIT_TEXTURE : NEURON_TEXTURE, size, size);
}

function bakeEmpty(graphics: Phaser.GameObjects.Graphics, size: number): void {
  const inset = TILE_INSET;
  const middle = size / 2;
  const corner = tileCornerRadius(size);
  const printed = mix(EMPTY_COLOR, TRACK_LIT_COLOR, 0.16);
  const run = Math.max(2, Math.round(size * 0.035));

  graphics.clear();

  graphics.fillStyle(EMPTY_COLOR, 1);
  graphics.fillRoundedRect(inset, inset, size - inset * 2, size - inset * 2, corner);

  graphics.fillStyle(printed, 1);
  graphics.fillRect(0, middle - run / 2, size, run);
  graphics.fillRect(middle - run / 2, 0, run, size);

  const ring = size * 0.12;
  graphics.lineStyle(run * 1.6, printed, 1);
  graphics.strokeCircle(middle, middle, ring);
  graphics.fillStyle(EMPTY_COLOR, 1);
  graphics.fillCircle(middle, middle, ring * 0.45);

  graphics.fillStyle(printed, 1);
  graphics.fillCircle(size * 0.16, middle, run * 1.3);
  graphics.fillCircle(middle, size * 0.84, run * 1.3);

  graphics.generateTexture(EMPTY_TILE_TEXTURE, size, size);
}

function drawShape(
  graphics: Phaser.GameObjects.Graphics,
  shape: PieceShape,
  center: number,
  radius: number,
  leading: number,
): void {
  const run = Math.max(3, Math.round(radius * 0.28));
  graphics.fillStyle(leading, 1);

  if (shape === 'pad') {
    graphics.fillRect(center - run / 2, center - radius, run, radius * 2);
    graphics.fillCircle(center, center, radius * 0.72);
    return;
  }

  if (shape === 'via') {
    graphics.lineStyle(radius * 0.49, leading, 1);
    graphics.strokeCircle(center, center, radius * 0.7);
    return;
  }

  if (shape === 'chip') {
    const half = radius * 0.62;
    for (const offset of [-half * 0.75, 0, half * 0.75]) {
      graphics.fillRect(center - radius, center + offset - run / 2, radius * 2, run);
    }
    graphics.fillRect(center - half, center - radius * 0.95, half * 2, radius * 1.9);
    return;
  }

  graphics.fillRect(center - run / 2, center - radius, run, radius);
  graphics.fillRect(center - radius, center - run / 2, radius * 2, run);
  graphics.fillCircle(center - radius, center, run);
  graphics.fillCircle(center + radius, center, run);
  graphics.fillCircle(center, center - radius, run);
}

function bakeOne(
  graphics: Phaser.GameObjects.Graphics,
  key: string,
  size: number,
  color: number,
  shape: PieceShape | null,
): void {
  const leading = mix(color, 0x000000, 0.62);
  const inset = TILE_INSET;
  const radius = tileCornerRadius(size);

  graphics.clear();

  graphics.fillStyle(color, 1);
  graphics.fillRoundedRect(inset, inset, size - inset * 2, size - inset * 2, radius);

  graphics.fillStyle(mix(color, 0xffffff, 0.55), 0.22);
  graphics.fillRoundedRect(inset, inset, size - inset * 2, (size - inset * 2) * 0.34, radius);

  graphics.lineStyle(3, leading, 1);
  graphics.strokeRoundedRect(inset, inset, size - inset * 2, size - inset * 2, radius);

  if (shape !== null) {
    drawShape(graphics, shape, size / 2, size * 0.24, leading);
  }

  graphics.generateTexture(key, size, size);
}

export function memoryArtTexture(key: string): string {
  return `memory-art-${key}`;
}

/** Twice the display width, for retina. */
const MEMORY_ART_WIDTH = 660;

/**
 * Panes and leading only: `drawShape` centres on a single coordinate and cannot
 * be offset into a cell.
 */
function bakeMemoryArt(
  graphics: Phaser.GameObjects.Graphics,
  key: string,
  art: MemoryArt,
): void {
  const cell = Math.max(3, Math.floor(MEMORY_ART_WIDTH / art.columns));
  const inset = cell >= 10 ? 1 : 0;

  graphics.clear();

  for (let row = 0; row < art.rows.length; row += 1) {
    const line = art.rows[row];
    for (let column = 0; column < art.columns; column += 1) {
      const mark = line[column];
      if (mark === undefined || mark === '.') {
        continue;
      }

      const pieceType = Number(mark);
      if (!Number.isInteger(pieceType) || pieceType >= PIECE_TYPE_COUNT) {
        continue;
      }

      const x = column * cell;
      const y = row * cell;
      const colour = PIECE_COLORS[pieceType];

      graphics.fillStyle(mix(colour, 0x000000, 0.62), 1);
      graphics.fillRect(x, y, cell, cell);
      graphics.fillStyle(colour, 1);
      graphics.fillRect(x + inset, y + inset, cell - inset * 2, cell - inset * 2);
    }
  }

  graphics.generateTexture(memoryArtTexture(key), art.columns * cell, art.rows.length * cell);
}

/**
 * Must run before anything references a key: an image or emitter built against a
 * missing texture renders as a placeholder and never recovers.
 */
export function bakeTileTextures(scene: Phaser.Scene, size: number, gap: number): void {
  const graphics = scene.add.graphics();

  for (let pieceType = 0; pieceType < PIECE_TYPE_COUNT; pieceType += 1) {
    bakeOne(graphics, tileTexture(pieceType), size, PIECE_COLORS[pieceType], PIECE_SHAPES[pieceType]);
  }

  bakeEmpty(graphics, size);

  bakeNeuron(graphics, size, false);
  bakeNeuron(graphics, size, true);

  for (let strength = 1; strength <= MAX_SHADOW_STRENGTH; strength += 1) {
    bakeShadow(graphics, size, strength);
  }
  bakeShadowEyes(graphics, size);

  for (const [key, art] of Object.entries(MEMORY_ART)) {
    bakeMemoryArt(graphics, key, art);
  }

  bakeTrace(graphics, gap);

  graphics.destroy();
}

function bakeShadow(
  graphics: Phaser.GameObjects.Graphics,
  size: number,
  strength: number,
): void {
  const middle = size / 2;
  const menace = (strength - 1) / (MAX_SHADOW_STRENGTH - 1);

  graphics.clear();

  graphics.fillStyle(SHADOW_COLOR, PIT_OPACITY);
  graphics.fillRoundedRect(
    TILE_INSET,
    TILE_INSET,
    size - TILE_INSET * 2,
    size - TILE_INSET * 2,
    tileCornerRadius(size),
  );

  graphics.fillStyle(SHADOW_BODY_COLOR, 1);

  graphics.fillPoints([
    point(size, 0.2, 0.52),
    point(size, 0.8, 0.52),
    point(size, 0.9, 0.88),
    point(size, 0.1, 0.88),
  ], true);

  for (const [at, reach, lean] of [
    [0.1, 1.0, -0.06], [0.2, 0.92, -0.04], [0.31, 1.04, -0.02], [0.42, 0.95, 0.0],
    [0.52, 1.06, 0.01], [0.63, 0.93, 0.03], [0.74, 1.02, 0.05], [0.87, 0.96, 0.07],
  ] as const) {
    graphics.fillTriangle(
      size * (at - 0.045), size * 0.66,
      size * (at + 0.045), size * 0.66,
      size * (at + lean), size * reach,
    );
  }

  drawCrown(graphics, size, strength);

  graphics.fillCircle(middle, size * HEAD_ROW, size * HEAD_RADIUS);

  graphics.fillStyle(mix(SHADOW_BODY_COLOR, SHADOW_EDGE_COLOR, 0.14), 1);
  graphics.fillCircle(middle, size * HEAD_ROW, size * HEAD_RADIUS);

  drawFringe(graphics, size);
  drawMouth(graphics, size);

  for (const light of [
    { x: 0.5, y: HEAD_ROW, radius: HEAD_RADIUS, from: 1.2, to: 1.62, alpha: 0.5 + menace * 0.45 },
  ]) {
    graphics.lineStyle(2, SHADOW_EDGE_COLOR, light.alpha);
    graphics.beginPath();
    graphics.arc(
      size * light.x,
      size * light.y,
      size * light.radius,
      Math.PI * light.from,
      Math.PI * light.to,
    );
    graphics.strokePath();
  }

  drawEyes(graphics, size, mix(SHADOW_EYE_GLOW, SHADOW_COLOR, 0.36 - menace * 0.18));

  graphics.generateTexture(shadowBodyTexture(strength), size, size);
}

/**
 * Final colours rather than white-and-tinted: a tint flattens the halo into the
 * core.
 */
function bakeShadowEyes(graphics: Phaser.GameObjects.Graphics, size: number): void {
  graphics.clear();

  for (const side of [-1, 1]) {
    const x = size * (0.5 + side * EYE_SPREAD);
    const y = size * EYE_ROW;

    for (const [radius, alpha] of [[0.15, 0.09], [0.1, 0.14], [0.065, 0.24]] as const) {
      graphics.fillStyle(SHADOW_EYE_GLOW, alpha);
      graphics.fillCircle(x, y, size * radius);
    }
  }

  drawEyes(graphics, size, SHADOW_EYE_COLOR);

  graphics.generateTexture(SHADOW_EYES_TEXTURE, size, size);
}

function drawEyes(graphics: Phaser.GameObjects.Graphics, size: number, color: number): void {
  graphics.fillStyle(color, 1);

  for (const side of [-1, 1]) {
    const x = size * (0.5 + side * EYE_SPREAD);
    const y = size * EYE_ROW + size * side * 0.006;

    graphics.fillEllipse(x, y, size * EYE_WIDTH, size * EYE_HEIGHT);
  }
}

function drawFringe(graphics: Phaser.GameObjects.Graphics, size: number): void {
  graphics.fillStyle(SHADOW_BODY_COLOR, 1);

  for (const [at, reach, width] of [
    [0.45, 0.54, 0.022], [0.5, 0.6, 0.028], [0.555, 0.5, 0.018],
  ] as const) {
    graphics.fillTriangle(
      size * (at - width), size * 0.33,
      size * (at + width), size * 0.33,
      size * at, size * reach,
    );
  }
}

function drawMouth(graphics: Phaser.GameObjects.Graphics, size: number): void {
  const left = 0.33;
  const right = 0.67;
  const top = 0.6;
  const bottom = 0.69;

  graphics.fillStyle(SHADOW_COLOR, 1);
  graphics.fillPoints([
    point(size, left, top),
    point(size, right, top),
    point(size, right - 0.03, bottom),
    point(size, left + 0.03, bottom),
  ], true);

  graphics.fillStyle(mix(SHADOW_EDGE_COLOR, SHADOW_COLOR, 0.35), 1);
  const tooth = (right - left) / 4;
  for (let index = 0; index < 4; index += 1) {
    const at = left + tooth * index;
    graphics.fillTriangle(
      size * at, size * top,
      size * (at + tooth), size * top,
      size * (at + tooth / 2), size * (top + 0.055),
    );
  }
}

/**
 * Tips must never go negative: `generateTexture` crops at the texture edge, so a
 * spike given a negative y is silently flattened rather than drawn taller.
 *
 * Must stay the same length as `MAX_SHADOW_STRENGTH` — `drawCrown` indexes
 * straight into it.
 */
const CROWNS = [
  {
    tips: [[0.22, 0.25], [0.38, 0.17], [0.58, 0.16], [0.76, 0.27]],
    base: 0.45,
    valley: 0.35,
  },
  {
    tips: [[0.16, 0.15], [0.29, 0.03], [0.42, 0.11], [0.55, 0.0], [0.68, 0.08], [0.82, 0.18]],
    base: 0.42,
    valley: 0.28,
  },
] as const;

function drawCrown(graphics: Phaser.GameObjects.Graphics, size: number, strength: number): void {
  const { tips, base, valley } = CROWNS[Math.min(strength, MAX_SHADOW_STRENGTH) - 1];

  const points = [point(size, 0.1, base)];
  for (let index = 0; index < tips.length; index += 1) {
    const [x, y] = tips[index];
    points.push(point(size, x, y));
    const next = tips[index + 1];
    points.push(point(size, next === undefined ? 0.9 : (x + next[0]) / 2, valley));
  }
  points.push(point(size, 0.9, base));

  graphics.fillPoints(points, true);
}

function point(size: number, x: number, y: number): PhaserMath.Vector2 {
  return new PhaserMath.Vector2(size * x, size * y);
}

function bakeTrace(graphics: Phaser.GameObjects.Graphics, gap: number): void {
  const length = gap + TRACE_OVERLAP * 2;
  const thickness = 12;
  const middle = thickness / 2;

  graphics.clear();
  graphics.fillStyle(0xffffff, 1);
  graphics.fillRect(0, middle - 2, length, 4);
  graphics.fillCircle(3, middle, 4);
  graphics.fillCircle(length - 3, middle, 4);
  graphics.generateTexture(TRACE_TEXTURE, length, thickness);
}
