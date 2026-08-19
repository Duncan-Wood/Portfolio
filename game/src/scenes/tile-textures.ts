import { Math as PhaserMath } from 'phaser';
import { PIECE_TYPE_COUNT } from '../engine/grid';
import { EMPTY_COLOR, PIECE_COLORS, PIECE_SHAPES, type PieceShape } from '../palette';

/*
 * What a tile looks like, baked once into a texture per piece type.
 *
 * Drawn at runtime with `Graphics.generateTexture` rather than loaded from
 * files, for the same reason the audio is synthesised: the game ships no art,
 * no loader step and no licences, and a colour change is one hex literal rather
 * than five exported PNGs that can fall out of step with each other.
 *
 * Baked ONCE, in `create`, and never again — a texture is uploaded to the GPU
 * on first use, so drawing one per tile per frame would be the most expensive
 * thing in the game. After baking, a cell changes type by swapping a texture
 * key, which costs nothing.
 *
 * The look follows ART-DIRECTION: a jewel-toned pane, the leading around it
 * drawn dark, and the figure inside drawn in that same lead. The figure is not
 * decoration — see `PIECE_SHAPES` for why colour alone will not do.
 */

const EMPTY_TILE_TEXTURE = 'tile-empty';

/** The texture key for a piece type. Bake before any of these are used. */
export function tileTexture(pieceType: number | null): string {
  return pieceType === null ? EMPTY_TILE_TEXTURE : `tile-${pieceType}`;
}

/**
 * Blend `color` toward `toward` by `amount` (0 = unchanged, 1 = fully
 * `toward`). Phaser has colour objects for this, but they allocate; these
 * run a handful of times at boot and the arithmetic is the whole story.
 */
function mix(color: number, toward: number, amount: number): number {
  const blend = (shift: number): number => {
    const from = (color >> shift) & 0xff;
    const to = (toward >> shift) & 0xff;
    return Math.round(from + (to - from) * amount) << shift;
  };

  return blend(16) | blend(8) | blend(0);
}

/**
 * The points of a five-pointed star, alternating between the outer radius and
 * an inner one. Starts at -90° so a point faces up; a star resting on a vertex
 * reads as an error rather than as a star.
 */
function starPoints(centerX: number, centerY: number, radius: number): PhaserMath.Vector2[] {
  const points: PhaserMath.Vector2[] = [];

  for (let index = 0; index < 10; index += 1) {
    const reach = index % 2 === 0 ? radius : radius * 0.45;
    const angle = -Math.PI / 2 + (index * Math.PI) / 5;
    points.push(
      new PhaserMath.Vector2(centerX + Math.cos(angle) * reach, centerY + Math.sin(angle) * reach),
    );
  }

  return points;
}

function drawShape(
  graphics: Phaser.GameObjects.Graphics,
  shape: PieceShape,
  center: number,
  radius: number,
): void {
  if (shape === 'circle') {
    graphics.fillCircle(center, center, radius);
    return;
  }

  if (shape === 'square') {
    const side = radius * 1.7;
    graphics.fillRect(center - side / 2, center - side / 2, side, side);
    return;
  }

  if (shape === 'diamond') {
    graphics.fillPoints(
      [
        new PhaserMath.Vector2(center, center - radius),
        new PhaserMath.Vector2(center + radius, center),
        new PhaserMath.Vector2(center, center + radius),
        new PhaserMath.Vector2(center - radius, center),
      ],
      true,
    );
    return;
  }

  graphics.fillPoints(starPoints(center, center, radius), true);
}

function bakeOne(
  graphics: Phaser.GameObjects.Graphics,
  key: string,
  size: number,
  color: number,
  shape: PieceShape | null,
): void {
  const leading = mix(color, 0x000000, 0.62);
  const inset = 2;
  const radius = Math.round(size * 0.18);

  graphics.clear();

  graphics.fillStyle(color, 1);
  graphics.fillRoundedRect(inset, inset, size - inset * 2, size - inset * 2, radius);

  // Light catching the top of the pane. Low alpha and only the upper third, so
  // it suggests glass without costing any contrast against the figure below.
  graphics.fillStyle(mix(color, 0xffffff, 0.55), 0.22);
  graphics.fillRoundedRect(inset, inset, size - inset * 2, (size - inset * 2) * 0.34, radius);

  graphics.lineStyle(3, leading, 1);
  graphics.strokeRoundedRect(inset, inset, size - inset * 2, size - inset * 2, radius);

  if (shape !== null) {
    graphics.fillStyle(leading, 1);
    drawShape(graphics, shape, size / 2, size * 0.22);
  }

  graphics.generateTexture(key, size, size);
}

/**
 * Draw every tile texture the board will ask for, at `size` pixels square.
 *
 * Must run before anything that references a key — an emitter or image built
 * against a texture that does not exist yet renders as Phaser's missing-texture
 * placeholder and never recovers, which is how the spark texture first shipped.
 */
export function bakeTileTextures(scene: Phaser.Scene, size: number): void {
  const graphics = scene.add.graphics();

  for (let pieceType = 0; pieceType < PIECE_TYPE_COUNT; pieceType += 1) {
    bakeOne(graphics, tileTexture(pieceType), size, PIECE_COLORS[pieceType], PIECE_SHAPES[pieceType]);
  }

  // The empty cell gets a texture too, so every cell on the board is one image
  // whose only per-frame change is which key it points at.
  bakeOne(graphics, EMPTY_TILE_TEXTURE, size, EMPTY_COLOR, null);

  graphics.destroy();
}
