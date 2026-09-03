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

/*
 * What a tile looks like, baked once into a texture per piece type.
 *
 * Drawn at runtime rather than loaded, so the game ships no art, no loader step
 * and no licences.
 *
 * Baked ONCE, in `create`: a texture uploads to the GPU on first use, so baking
 * per tile per frame would be the most expensive thing in the game. Afterwards a
 * cell changes type by swapping a key, which costs nothing.
 */

const EMPTY_TILE_TEXTURE = 'tile-empty';

/**
 * Baked white so one texture tints to any piece colour, and horizontally so the
 * vertical case is a rotation rather than a second bake to keep in step.
 */
export const TRACE_TEXTURE = 'trace';

/** How far a trace reaches onto the tile at each end, beyond the gap it spans. */
const TRACE_OVERLAP = 11;

/**
 * Apart from the body so the scene can blink and flare them. A dim pair is baked
 * into the BODY as well, because this overlay is only drawn for a settled
 * shadow — without them one in mid-fall would go visibly blind.
 */
export const SHADOW_EYES_TEXTURE = 'shadow-eyes';

/**
 * One texture per strength, laid OVER the tile it has taken so the player can
 * see WHICH tile is possessed. The pit is part-transparent so the colour
 * underneath still reads; the creature stays opaque so it keeps its silhouette.
 */
export function shadowBodyTexture(strength: number): string {
  return `shadow-body-${Math.min(Math.max(strength, 1), MAX_SHADOW_STRENGTH)}`;
}

/**
 * Dark enough that the creature is a silhouette over a bright tile, light enough
 * that the colour under a dark one is still nameable.
 */
const PIT_OPACITY = 0.8;

/** Where the shadow's head and eyes sit, as fractions of the tile's size. */
const HEAD_ROW = 0.5;
const HEAD_RADIUS = 0.19;
const EYE_SPREAD = 0.105;
const EYE_ROW = 0.48;
const EYE_WIDTH = 0.115;
const EYE_HEIGHT = 0.105;

/** The shadow's pit must sit on the same rectangle as the panes. */
const TILE_INSET = 2;

function tileCornerRadius(size: number): number {
  return Math.round(size * 0.18);
}

const NEURON_TEXTURE = 'neuron';
const NEURON_LIT_TEXTURE = 'neuron-lit';

/** Bake before any of these are used. */
export function tileTexture(pieceType: number | null): string {
  if (pieceType === null) {
    return EMPTY_TILE_TEXTURE;
  }
  // Asked here rather than at the call site, so the scene keeps painting a
  // board by mapping each cell to one key and nothing has to learn that a
  // neuron is a different KIND of occupant.
  if (isNeuron(pieceType)) {
    return isNeuronLit(pieceType) ? NEURON_LIT_TEXTURE : NEURON_TEXTURE;
  }
  return `tile-${pieceType}`;
}

/**
 * A socket set into the board, with a terminal at the centre.
 *
 * What separates an OCCUPIED cell from an empty one is an EDGE: a tile has its
 * leading, a possessed cell has the rim of its pit, an empty cell has none. A
 * neuron is occupied, so it gets one — without it the cell reads as a hole and
 * the tiles resting on it look like they are floating.
 *
 * Lit is the same socket burning: it turns on rather than becoming something else.
 */
function bakeNeuron(graphics: Phaser.GameObjects.Graphics, size: number, lit: boolean): void {
  const middle = size / 2;
  const inset = TILE_INSET;
  const span = size - inset * 2;
  const corner = tileCornerRadius(size);
  const ink = lit ? NEURON_LIT_COLOR : NEURON_COLOR;
  const run = Math.max(3, Math.round(size * 0.055));

  graphics.clear();

  // The socket, sunk below the substrate so the bezel has something to sit
  // against. Deliberately NOT as dark as the shadow's pit: that darkness means
  // "no room here", and a neuron is the opposite — it is the thing you want.
  graphics.fillStyle(mix(EMPTY_COLOR, 0x000000, 0.45), 1);
  graphics.fillRoundedRect(inset, inset, span, span, corner);

  if (lit) {
    for (const [radius, alpha] of [[0.42, 0.2], [0.26, 0.18]] as const) {
      graphics.fillStyle(SHADOW_EYE_GLOW, alpha);
      graphics.fillCircle(middle, middle, size * radius);
    }
  }

  // Dendrites: four stubs reaching OUT to the edges, so a neuron is visibly
  // wired into the board rather than an icon dropped on top of one. Stubs
  // rather than a full cross — a full cross is what the empty cell prints, and
  // borrowing it back is how this went invisible the first time.
  graphics.fillStyle(ink, lit ? 1 : 0.85);
  for (const [x, y, w, h] of [
    [middle - run / 2, 0, run, size * 0.3],
    [middle - run / 2, size * 0.7, run, size * 0.3],
    [0, middle - run / 2, size * 0.3, run],
    [size * 0.7, middle - run / 2, size * 0.3, run],
  ] as const) {
    graphics.fillRect(x, y, w, h);
  }

  // The terminal: the circle-and-dot the memory maps put at the end of every
  // thread — but only a LIT one has the dot.
  //
  // That is the whole lit/unlit read, and it is binary on purpose. Both states
  // started out as the same figure at two brightnesses, which meant telling
  // them apart was a judgement about violet — hopeless at a glance, and a
  // glance is all a player gets while deciding where the next piece goes. An
  // empty socket and a socket with a light in it need no comparison.
  const ring = size * 0.2;
  graphics.lineStyle(run * 1.3, ink, 1);
  graphics.strokeCircle(middle, middle, ring);

  if (lit) {
    graphics.fillStyle(SHADOW_EYE_GLOW, 0.5);
    graphics.fillCircle(middle, middle, size * 0.14);
    graphics.fillStyle(SHADOW_EYE_COLOR, 1);
    graphics.fillCircle(middle, middle, size * 0.09);
  }

  // The edge. The whole reason this reads as a cell with something in it.
  graphics.lineStyle(3, ink, lit ? 1 : 0.9);
  graphics.strokeRoundedRect(inset, inset, span, span, corner);

  graphics.generateTexture(lit ? NEURON_LIT_TEXTURE : NEURON_TEXTURE, size, size);
}

/**
 * Bare substrate with dormant routing, so the wiring is present before any of it
 * carries anything. The runs REACH THE EDGE: two neighbouring cells line their
 * stubs up across the gap and read as one continuous route.
 *
 * A hair above the ground colour — it has to survive being looked past, and a
 * substrate that competes with the tiles is worse than none.
 */
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

  // Drilled, so the substrate shows through the middle — the same figure the
  // 'via' piece gets, which is what ties an empty cell to the tiles' vocabulary.
  const ring = size * 0.12;
  graphics.lineStyle(run * 1.6, printed, 1);
  graphics.strokeCircle(middle, middle, ring);
  graphics.fillStyle(EMPTY_COLOR, 1);
  graphics.fillCircle(middle, middle, ring * 0.45);

  // Two pads, off-centre. A board where every cell is identical reads as graph
  // paper rather than as something that was routed.
  graphics.fillStyle(printed, 1);
  graphics.fillCircle(size * 0.16, middle, run * 1.3);
  graphics.fillCircle(middle, size * 0.84, run * 1.3);

  graphics.generateTexture(EMPTY_TILE_TEXTURE, size, size);
}

/**
 * Built from the same two primitives the traces use, so a tile reads as part of
 * the network rather than an icon on top of one. Deliberately blunt: at this
 * size, travelling, the silhouette is all the player gets.
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
 * Must run before anything that references a key: an emitter or image built
 * against a missing texture renders as a placeholder and never recovers.
 */
export function memoryArtTexture(key: string): string {
  return `memory-art-${key}`;
}

/**
 * Sized to the box rather than the grid, so cell size falls out of how many
 * cells there are: a 16-wide portrait gets fat cells, a 54-wide crowd gets small
 * ones that read as a mass of people. Twice the display width, for retina.
 */
const MEMORY_ART_WIDTH = 660;

/**
 * Baked out of the game's own tiles, so a memory is visibly made of the same
 * material as the board — the one thing a photograph could not say.
 *
 * Panes and leading only: `drawShape` centres on a single coordinate and cannot
 * be offset into a cell, and at this size a pad and a via are the same four dots.
 */
function bakeMemoryArt(
  graphics: Phaser.GameObjects.Graphics,
  key: string,
  art: MemoryArt,
): void {
  const cell = Math.max(3, Math.floor(MEMORY_ART_WIDTH / art.columns));
  // A hairline of leading, once a cell is big enough to show one. Below that
  // the gap eats the colour and the picture goes muddy.
  const inset = cell >= 10 ? 1 : 0;

  graphics.clear();

  for (let row = 0; row < art.rows.length; row += 1) {
    const line = art.rows[row];
    for (let column = 0; column < art.columns; column += 1) {
      const mark = line[column];
      // '.' is the ground showing through. Left undrawn rather than filled, so
      // the gutters between faces are the page rather than a colour.
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

export function bakeTileTextures(scene: Phaser.Scene, size: number, gap: number): void {
  const graphics = scene.add.graphics();

  for (let pieceType = 0; pieceType < PIECE_TYPE_COUNT; pieceType += 1) {
    bakeOne(graphics, tileTexture(pieceType), size, PIECE_COLORS[pieceType], PIECE_SHAPES[pieceType]);
  }

  // The empty cell gets a texture too, so every cell on the board is one image
  // whose only per-frame change is which key it points at.
  bakeEmpty(graphics, size);

  bakeNeuron(graphics, size, false);
  bakeNeuron(graphics, size, true);

  // One overlay per shadow strength. The creature is the same at every tier —
  // what grows is its crown and the light on it, because the crown is already
  // the largest thing on the silhouette and is what survives at speed. A hit
  // that fails to free the tile swaps the overlay down a tier, so the crown
  // visibly shrinks: the damage feedback costs nothing beyond baking these.
  // Two textures, not one per colour: the colour comes from the tile below.
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

/**
 * A pit with something crouching in it, not a tile with the colour taken out.
 *
 * The rule at this size: NOTHING on it is smooth, because a silhouette with no
 * sharp edge reads as cute. The crown and the teeth survive at speed, so they
 * are the largest things on it.
 *
 * Drawn past the inset the tiles respect, so a run of them merges across the
 * gaps into one mass rather than a tidy row of blocks.
 */
function bakeShadow(
  graphics: Phaser.GameObjects.Graphics,
  size: number,
  strength: number,
): void {
  const middle = size / 2;
  const menace = (strength - 1) / (MAX_SHADOW_STRENGTH - 1);

  graphics.clear();

  // The pit it sits in, kept to the same rounded rect as every other cell so
  // the grid itself stays readable — the board still has to be scannable.
  // Part-transparent, so the tile it has taken still shows through.
  graphics.fillStyle(SHADOW_COLOR, PIT_OPACITY);
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

  drawCrown(graphics, size, strength);

  graphics.fillCircle(middle, size * HEAD_ROW, size * HEAD_RADIUS);

  // The head, a shade off the body it is sunk into. Without the step the crown
  // and the head merge into one lump and the thing has no face — which is the
  // whole reason it is worth drawing a creature at all.
  graphics.fillStyle(mix(SHADOW_BODY_COLOR, SHADOW_EDGE_COLOR, 0.14), 1);
  graphics.fillCircle(middle, size * HEAD_ROW, size * HEAD_RADIUS);

  drawFringe(graphics, size);
  drawMouth(graphics, size);

  // Rim light rather than an outline: separate catches off the crown of the
  // head, because an unbroken contour reads as a box left unfilled.
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

  // Eyes, dimmed. The scene lays the lit pair on top of these — dimmed toward
  // their own halo rather than toward the pit, because grey eyes on a violet
  // creature read as two chips of stone.
  drawEyes(graphics, size, mix(SHADOW_EYE_GLOW, SHADOW_COLOR, 0.36 - menace * 0.18));

  graphics.generateTexture(shadowBodyTexture(strength), size, size);
}

/**
 * Baked in final colours rather than white-and-tinted: the halo and the core are
 * different colours, and a tint flattens them into one. The scene brightens them
 * by alpha and scale.
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
 * Tipped slightly, so they are not a matched pair. Round rather than narrow:
 * narrow eyes are the first thing to disappear at this size.
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
 * The cavity is the pit's own colour — a hole rather than paint — and the teeth
 * are lit, because a dark tooth in a dark mouth is a smudge at this size.
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
 * The crest at each strength, weakest first — the only axis the tiers are told
 * apart on, because it is the only one that survives at this size.
 *
 * Tips must never go negative: `generateTexture` crops at the texture edge, so a
 * spike given a negative y is silently flattened rather than drawn taller. A
 * taller tier buys its height from a lower base and valley.
 *
 * This array and `MAX_SHADOW_STRENGTH` must stay the same length — `drawCrown`
 * indexes straight into it.
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

/**
 * A jagged ridge rather than radial fans, which collapse into smooth lobes at
 * this size. One polygon rather than a row of triangles, so the spikes share a
 * base and read as one torn mass — uneven and off centre, because an even crest
 * is a crown and this is meant to look broken.
 */
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

/** A point at a fraction of the tile. */
function point(size: number, x: number, y: number): PhaserMath.Vector2 {
  return new PhaserMath.Vector2(size * x, size * y);
}

/**
 * White, so one texture tints to any colour, and long enough to reach
 * `TRACE_OVERLAP` onto each tile so it looks soldered rather than floating.
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
