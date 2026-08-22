import { Math as PhaserMath } from 'phaser';
import { PIECE_TYPE_COUNT, SHADOW } from '../engine/grid';
import {
  EMPTY_COLOR,
  PIECE_COLORS,
  PIECE_SHAPES,
  SHADOW_BODY_COLOR,
  SHADOW_COLOR,
  SHADOW_EDGE_COLOR,
  SHADOW_EYE_COLOR,
  SHADOW_EYE_GLOW,
  mix,
  type PieceShape,
} from '../palette';

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

/**
 * The shadow's eyes, baked apart from its body so the scene can blink them,
 * flare them as one arrives, and add them over the top of whatever they are
 * sitting on.
 *
 * A dim pair is baked into the body as well. The overlay is only drawn for a
 * shadow that is settled and idling, so without them a shadow in mid-fall — or
 * one being blown off the board — would go briefly, and visibly, blind.
 */
export const SHADOW_EYES_TEXTURE = 'shadow-eyes';

/** Where the shadow's head and eyes sit, as fractions of the tile's size. */
const HEAD_ROW = 0.5;
const HEAD_RADIUS = 0.19;
const EYE_SPREAD = 0.105;
const EYE_ROW = 0.48;
const EYE_WIDTH = 0.115;
const EYE_HEIGHT = 0.105;

/**
 * The border every tile leaves around itself, and the roundness of its corner.
 *
 * Shared rather than written once per bake: the shadow's pit has to sit on the
 * same rectangle as the panes for the grid to stay readable at speed, and that
 * is an invariant two copies of a magic number cannot keep.
 */
const TILE_INSET = 2;

function tileCornerRadius(size: number): number {
  return Math.round(size * 0.18);
}

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
  const inset = TILE_INSET;
  const radius = tileCornerRadius(size);

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

  bakeShadow(graphics, size);
  bakeShadowEyes(graphics, size);

  bakeTrace(graphics, gap);

  graphics.destroy();
}

/**
 * A cell the shadow holds.
 *
 * Not a tile with the colour taken out — a pit, with something crouching in it.
 * Drawn from a pencil study rather than invented: a jagged crown springing from
 * both sides of the head,
 * big round eyes under a spiked fringe, a wide mouth of zigzag teeth, and a
 * body that is a fan of long torn strokes rather than a solid shape.
 *
 * The rule the drawings set, and the one that matters at 64 pixels: NOTHING on
 * it is smooth. The pass before this one was built from circles and two thin
 * curled antennae, and a silhouette with no sharp edge in it reads as cute — a
 * rabbit, at the size the player actually sees. The crown is the largest thing
 * on the creature in the reference, so it is the largest thing here; it and the
 * teeth are what survive at speed.
 *
 * It is drawn out to the very edge of the texture and past the inset the tiles
 * respect, so a run of them merges across the gaps into one mass rather than
 * lining up as a tidy row of blocks.
 */
function bakeShadow(graphics: Phaser.GameObjects.Graphics, size: number): void {
  const middle = size / 2;

  graphics.clear();

  // The pit it sits in, kept to the same rounded rect as every other cell so
  // the grid itself stays readable — the board still has to be scannable.
  graphics.fillStyle(SHADOW_COLOR, 1);
  graphics.fillRoundedRect(
    TILE_INSET,
    TILE_INSET,
    size - TILE_INSET * 2,
    size - TILE_INSET * 2,
    tileCornerRadius(size),
  );

  graphics.fillStyle(SHADOW_BODY_COLOR, 1);

  // The body: a fan of long torn strokes hanging from under the head, over a
  // rough mass so the strokes are its hem rather than legs it is standing on.
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

  drawCrown(graphics, size);

  graphics.fillCircle(middle, size * HEAD_ROW, size * HEAD_RADIUS);

  // The head, a shade off the body it is sunk into. Without the step the crown
  // and the head merge into one lump and the thing has no face — which is the
  // whole reason it is worth drawing a creature at all.
  graphics.fillStyle(mix(SHADOW_BODY_COLOR, SHADOW_EDGE_COLOR, 0.14), 1);
  graphics.fillCircle(middle, size * HEAD_ROW, size * HEAD_RADIUS);

  drawFringe(graphics, size);
  drawMouth(graphics, size);

  // The light on it, in three separate catches rather than one contour: the
  // crown on each side, and a short skim off the crown of the head. Rim light,
  // not an outline — an unbroken outline is what made the first version look
  // like a box someone had forgotten to fill in.
  for (const light of [
    { x: 0.5, y: HEAD_ROW, radius: HEAD_RADIUS, from: 1.2, to: 1.62, alpha: 0.8 },
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

  // Eyes, dimmed. The scene lays the lit pair on top of these — dimmed toward
  // their own halo rather than toward the pit, because grey eyes on a violet
  // creature read as two chips of stone.
  drawEyes(graphics, size, mix(SHADOW_EYE_GLOW, SHADOW_COLOR, 0.22));

  graphics.generateTexture(tileTexture(SHADOW), size, size);
}

/**
 * The lit eyes on their own, over a violet halo, sized to the tile so the scene
 * can drop one straight onto a cell centre.
 *
 * Baked in their final colours rather than white-and-tinted, because the halo
 * and the core are two different colours and a tint would flatten them into
 * one. The scene brightens them by alpha and scale instead.
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

/**
 * Two wide eyes, tipped very slightly so they are not a matched pair.
 *
 * Round rather than the narrow slanted almonds this had first: the reference
 * draws them as big open ovals, and the menace in it comes from the crown, the
 * fringe and the teeth. Angry eyes on top of all three was one idea too many,
 * and narrow eyes are the first thing to disappear at 64 pixels.
 */
function drawEyes(graphics: Phaser.GameObjects.Graphics, size: number, color: number): void {
  graphics.fillStyle(color, 1);

  for (const side of [-1, 1]) {
    const x = size * (0.5 + side * EYE_SPREAD);
    const y = size * EYE_ROW + size * side * 0.006;

    graphics.fillEllipse(x, y, size * EYE_WIDTH, size * EYE_HEIGHT);
  }
}

/** The spikes hanging over the brow, between and above the eyes. */
function drawFringe(graphics: Phaser.GameObjects.Graphics, size: number): void {
  graphics.fillStyle(SHADOW_BODY_COLOR, 1);

  // Between the eyes only, and unevenly. Spread across the whole brow they
  // crossed the eyes and read as the bars of a grille.
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

/**
 * A wide mouth of zigzag teeth.
 *
 * The cavity is the pit's own colour — a hole in the creature rather than paint
 * on it — and the teeth are lit, because at this size a dark tooth inside a
 * dark mouth is a smudge. It is the second thing after the crown that survives
 * being 64 pixels across, so it is worth the six triangles.
 */
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
 * The crown: a torn crest of spikes rising off the top of the head.
 *
 * A crest rather than the two radial antler-fans this was built as first. Those
 * followed the portrait in `shadow 1.jpg` closely and were the right shape at
 * the wrong size — at 64 pixels each fan collapsed into a smooth lobe and the
 * creature grew two leaves. A jagged ridge is the half of the reference that
 * survives being a tile, and it is what `shadow 2.jpg` draws anyway.
 *
 * One polygon, not a row of triangles, so the spikes share a base and read as
 * one torn mass. The tips are uneven and the tallest is off centre: an even
 * crest is a crown, and this is meant to look broken.
 */
function drawCrown(graphics: Phaser.GameObjects.Graphics, size: number): void {
  const tips = [
    [0.16, 0.15], [0.29, 0.03], [0.42, 0.11], [0.55, 0.0], [0.68, 0.08], [0.82, 0.18],
  ] as const;
  const base = 0.42;
  const valley = 0.28;

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

/** A point at a fraction of the tile, for the shapes built out of polygons. */
function point(size: number, x: number, y: number): PhaserMath.Vector2 {
  return new PhaserMath.Vector2(size * x, size * y);
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
