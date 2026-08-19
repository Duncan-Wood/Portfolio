import { PIECE_TYPE_COUNT } from '../engine/grid';
import { EMPTY_COLOR, PIECE_COLORS, PIECE_SHAPES, mix, type PieceShape } from '../palette';

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
 * decoration — see `PIECE_SHAPES` for why colour alone will not do, and why
 * these four are circuit parts rather than arbitrary shapes.
 */

const EMPTY_TILE_TEXTURE = 'tile-empty';

/**
 * The trace that runs between two matching tiles: a segment with a pad at each
 * end, baked white so one texture can be tinted to any piece colour.
 *
 * Drawn horizontally and rotated for the vertical case, because a trace is
 * symmetrical and a second bake would be a second thing to keep in step.
 */
export const TRACE_TEXTURE = 'trace';

/** How far a trace reaches onto the tile at each end, beyond the gap it spans. */
const TRACE_OVERLAP = 11;

/** The texture key for a piece type. Bake before any of these are used. */
export function tileTexture(pieceType: number | null): string {
  return pieceType === null ? EMPTY_TILE_TEXTURE : `tile-${pieceType}`;
}

/**
 * One figure from the circuit vocabulary, centred in the tile.
 *
 * Every one of these is built from the same two primitives the traces between
 * tiles use — a straight run and a round pad — so a tile reads as a piece of
 * the same network rather than as an icon sitting on top of one. They are
 * deliberately blunt: at 64px, travelling, the silhouette is all the player
 * gets, and ART-DIRECTION puts readability above ornament.
 */
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
    // A solid pad on a stub of trace: the plainest terminal there is.
    graphics.fillRect(center - run / 2, center - radius, run, radius * 2);
    graphics.fillCircle(center, center, radius * 0.72);
    return;
  }

  if (shape === 'via') {
    // A pad drilled through. Stroked rather than two filled circles, so the
    // hole shows the actual pane — highlight included — instead of a flat disc
    // of the base colour painted back over it.
    graphics.lineStyle(radius * 0.49, leading, 1);
    graphics.strokeCircle(center, center, radius * 0.7);
    return;
  }

  if (shape === 'chip') {
    // The block at the leaf's midrib: a body with legs down both sides.
    const half = radius * 0.62;
    for (const offset of [-half * 0.75, 0, half * 0.75]) {
      graphics.fillRect(center - radius, center + offset - run / 2, radius * 2, run);
    }
    graphics.fillRect(center - half, center - radius * 0.95, half * 2, radius * 1.9);
    return;
  }

  // A trace that forks: one run in from the top, two out to the sides. Stops at
  // the centre rather than continuing down — a full cross is symmetrical, and
  // symmetrical it just reads as a plus sign.
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
    drawShape(graphics, shape, size / 2, size * 0.24, leading);
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
export function bakeTileTextures(scene: Phaser.Scene, size: number, gap: number): void {
  const graphics = scene.add.graphics();

  for (let pieceType = 0; pieceType < PIECE_TYPE_COUNT; pieceType += 1) {
    bakeOne(graphics, tileTexture(pieceType), size, PIECE_COLORS[pieceType], PIECE_SHAPES[pieceType]);
  }

  // The empty cell gets a texture too, so every cell on the board is one image
  // whose only per-frame change is which key it points at.
  bakeOne(graphics, EMPTY_TILE_TEXTURE, size, EMPTY_COLOR, null);

  bakeTrace(graphics, gap);

  graphics.destroy();
}

/**
 * The connector drawn between two matching neighbours.
 *
 * White, so one texture tints to any of the four colours. Long enough to span
 * the gap and reach `TRACE_OVERLAP` onto the tile at each end, which is what
 * makes it look soldered to both rather than floating between them.
 */
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
