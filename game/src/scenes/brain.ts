import { MEMORIES } from '../memories';
import { EMPTY_COLOR, SHADOW_EYE_GLOW, TRACK_COLOR, TRACK_LIT_COLOR, mix } from '../palette';

/*
 * The node brain: the thing the whole game is actually filling.
 *
 * This replaces the circuit ring, and the reason is the sharpest note the
 * project has had — "the writing and the game feel totally disconnected". They
 * were, and the meter was why. A ring of pads around the board could be filling
 * toward anything: a score, a level, a loading bar. It had no relationship to
 * what the text said, so clearing tiles and reading a memory were two
 * activities sharing a screen and the words landed as a reward dispenser going
 * off.
 *
 * The storyboard had already solved this and the ring is what was left after
 * the solution was removed. `node-brain-concept-1.jpg` is a brain of nodes with
 * one glowing; `connected-node-brain-concept-1.jpg` is those nodes reaching
 * outward, captioned "connecting w/ others". And every memory panel —
 * `memory-1-high-school.jpg` and its three siblings — is drawn as a set of
 * vignettes wired together. The tiles connect, a memory is connections, the
 * brain is connections: one metaphor at three scales.
 *
 * So the brain IS the meter, and each of its nodes IS a fragment. Lighting one
 * is not a threshold being crossed that then triggers some text; it is the
 * memory arriving, in the place the progress was going.
 *
 * ONE brain for the whole game, not one per memory. The nodes for memories
 * nobody has written yet are drawn dim, which is how a visitor can see how much
 * of this there is going to be from the shape of what is still dark.
 */

/** How many node slots the brain has room for, written or not. */
export const BRAIN_NODE_SLOTS = 16;

/**
 * Where each node sits, as a fraction of the brain's box.
 *
 * Hand-placed rather than generated. A grid reads as a grid, and an even
 * scatter reads as noise; these sit along the lobes the way the drawing put
 * them, close enough to the silhouette's edge to belong to it. Ordered so the
 * first memory fills the lower-left and later ones climb — a life going
 * upward, and the dark half is visibly the part not yet told.
 */
const NODE_SLOTS: readonly { x: number; y: number }[] = [
  { x: 0.26, y: 0.78 }, { x: 0.46, y: 0.86 }, { x: 0.66, y: 0.77 }, { x: 0.80, y: 0.63 },
  { x: 0.18, y: 0.62 }, { x: 0.37, y: 0.66 }, { x: 0.58, y: 0.60 }, { x: 0.76, y: 0.47 },
  { x: 0.22, y: 0.45 }, { x: 0.42, y: 0.49 }, { x: 0.62, y: 0.42 }, { x: 0.83, y: 0.33 },
  { x: 0.30, y: 0.29 }, { x: 0.50, y: 0.33 }, { x: 0.68, y: 0.24 }, { x: 0.45, y: 0.15 },
];

/** The node slot for a fragment index, wrapping if the game ever outgrows the brain. */
export function brainNode(index: number): { x: number; y: number } {
  return NODE_SLOTS[index % NODE_SLOTS.length];
}

/** How many fragments every written memory adds up to. */
export function writtenNodeCount(): number {
  return MEMORIES.reduce((total, memory) => total + memory.nodes.length, 0);
}

/**
 * The brain's outline, as fractions of its box.
 *
 * A bumpy closed curve rather than an anatomical drawing. What has to survive
 * at 170 pixels is the silhouette — a wide lobed mass, flat-ish underneath,
 * with a stem — and gyri read better as a lumpy edge than as internal detail.
 * Everything here is one polygon so it can be stroked as a single path; the
 * lumps come from the point positions, not from arcs, for the same reason the
 * progress pads were rects: Phaser steps an arc at a fixed 1/100 turn and pays
 * for it every frame.
 */
const OUTLINE: readonly { x: number; y: number }[] = [
  { x: 0.50, y: 0.04 }, { x: 0.62, y: 0.06 }, { x: 0.68, y: 0.13 }, { x: 0.79, y: 0.13 },
  { x: 0.86, y: 0.21 }, { x: 0.84, y: 0.30 }, { x: 0.93, y: 0.37 }, { x: 0.92, y: 0.47 },
  { x: 0.97, y: 0.55 }, { x: 0.91, y: 0.65 }, { x: 0.93, y: 0.74 }, { x: 0.84, y: 0.82 },
  { x: 0.72, y: 0.85 }, { x: 0.66, y: 0.93 }, { x: 0.56, y: 0.94 }, { x: 0.52, y: 0.88 },
  { x: 0.42, y: 0.94 }, { x: 0.31, y: 0.92 }, { x: 0.24, y: 0.84 }, { x: 0.13, y: 0.79 },
  { x: 0.08, y: 0.69 }, { x: 0.12, y: 0.60 }, { x: 0.05, y: 0.51 }, { x: 0.10, y: 0.41 },
  { x: 0.08, y: 0.31 }, { x: 0.17, y: 0.23 }, { x: 0.24, y: 0.11 }, { x: 0.37, y: 0.06 },
];

export interface BrainBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** A node slot's position in real pixels. */
export function brainNodeAt(index: number, box: BrainBox): { x: number; y: number } {
  const slot = brainNode(index);
  return { x: box.left + slot.x * box.width, y: box.top + slot.y * box.height };
}

/**
 * Draw the brain: its outline, the wiring between nodes, and every node.
 *
 * `lit` is how many fragments have been surfaced, and `arriving` is how far
 * along the next one is, 0..1 — so the node being worked toward brightens as
 * the board fills it, which is the whole point. Progress is no longer an
 * abstract meter that later triggers a memory; it is visibly this memory
 * coming in.
 */
export function drawBrain(
  graphics: Phaser.GameObjects.Graphics,
  box: BrainBox,
  lit: number,
  arriving: number,
): void {
  graphics.clear();

  const point = (fraction: { x: number; y: number }) => ({
    x: box.left + fraction.x * box.width,
    y: box.top + fraction.y * box.height,
  });

  // The mass, barely there. It is a container for the nodes, not a picture of a
  // brain — anything more solid competes with the board for attention, and the
  // board is what is read under time pressure.
  graphics.fillStyle(mix(EMPTY_COLOR, TRACK_COLOR, 0.45), 0.5);
  graphics.beginPath();
  const outline = OUTLINE.map(point);
  graphics.moveTo(outline[0].x, outline[0].y);
  for (const p of outline.slice(1)) {
    graphics.lineTo(p.x, p.y);
  }
  graphics.closePath();
  graphics.fillPath();

  graphics.lineStyle(1.5, TRACK_COLOR, 0.85);
  graphics.strokePath();

  // The stem, so it reads as a brain rather than as a cloud.
  const stemTop = point({ x: 0.5, y: 0.86 });
  const stemEnd = point({ x: 0.46, y: 1.0 });
  graphics.lineStyle(4, TRACK_COLOR, 0.85);
  graphics.lineBetween(stemTop.x, stemTop.y, stemEnd.x, stemEnd.y);

  const written = writtenNodeCount();

  // Wiring, drawn before the nodes so the nodes sit on top of it. A run that is
  // lit stays lit; the rest is the dark shape of what has not been told.
  for (let index = 1; index < BRAIN_NODE_SLOTS; index += 1) {
    const from = brainNodeAt(index - 1, box);
    const to = brainNodeAt(index, box);
    const earned = index < lit;

    graphics.lineStyle(earned ? 2 : 1, earned ? TRACK_LIT_COLOR : TRACK_COLOR, earned ? 0.75 : 0.3);
    graphics.lineBetween(from.x, from.y, to.x, to.y);
  }

  for (let index = 0; index < BRAIN_NODE_SLOTS; index += 1) {
    const at = brainNodeAt(index, box);
    const earned = index < lit;
    const isArriving = index === lit && arriving > 0;
    // Past the written memories there is nothing to earn yet, and saying so
    // quietly is the point: a visitor can see how much of this is still coming.
    const exists = index < written;

    if (earned || isArriving) {
      const strength = earned ? 1 : arriving;
      graphics.fillStyle(SHADOW_EYE_GLOW, 0.16 * strength);
      graphics.fillCircle(at.x, at.y, 9 + 4 * strength);
      graphics.fillStyle(TRACK_LIT_COLOR, 0.35 + 0.65 * strength);
      graphics.fillCircle(at.x, at.y, 4.5);
    } else {
      graphics.fillStyle(TRACK_COLOR, exists ? 0.8 : 0.35);
      graphics.fillCircle(at.x, at.y, exists ? 3.5 : 2.5);
    }
  }
}
