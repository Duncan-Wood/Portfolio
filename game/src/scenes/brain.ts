import { MEMORIES } from '../memories';
import { EMPTY_COLOR, SHADOW_EYE_GLOW, TRACK_COLOR, TRACK_LIT_COLOR, mix } from '../palette';

/*
 * The brain IS the meter and each node IS a fragment, so lighting one is the
 * memory arriving rather than a threshold that then triggers some text.
 *
 * ONE brain for the whole game. Nodes for memories nobody has written yet draw
 * dim, so what is still to come is visible in the shape of what is still dark.
 */

/** Slots the brain has room for, written or not. */
const BRAIN_NODE_SLOTS = 16;

/**
 * Hand-placed: a grid reads as a grid and an even scatter reads as noise.
 * Ordered so the first memory fills the lower-left and later ones climb.
 */
const NODE_SLOTS: readonly { x: number; y: number }[] = [
  { x: 0.26, y: 0.78 }, { x: 0.46, y: 0.86 }, { x: 0.66, y: 0.77 }, { x: 0.80, y: 0.63 },
  { x: 0.18, y: 0.62 }, { x: 0.37, y: 0.66 }, { x: 0.58, y: 0.60 }, { x: 0.76, y: 0.47 },
  { x: 0.22, y: 0.45 }, { x: 0.42, y: 0.49 }, { x: 0.62, y: 0.42 }, { x: 0.83, y: 0.33 },
  { x: 0.30, y: 0.29 }, { x: 0.50, y: 0.33 }, { x: 0.68, y: 0.24 }, { x: 0.45, y: 0.15 },
];

/** Wraps if the game ever outgrows the brain. */
function brainNode(index: number): { x: number; y: number } {
  return NODE_SLOTS[index % NODE_SLOTS.length];
}

function writtenNodeCount(): number {
  return MEMORIES.reduce((total, memory) => total + memory.nodes.length, 0);
}

/**
 * Only the silhouette survives at this size, so gyri are a lumpy edge rather
 * than internal detail. One polygon rather than arcs: Phaser steps an arc at a
 * fixed 1/100 turn and pays for it every frame.
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

interface BrainBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function brainNodeAt(index: number, box: BrainBox): { x: number; y: number } {
  const slot = brainNode(index);
  return { x: box.left + slot.x * box.width, y: box.top + slot.y * box.height };
}

/**
 * `lit` is how many fragments have surfaced; `arriving` is how far along the
 * next is, 0..1, so the node being worked toward brightens as the board fills it.
 */
export function drawBrain(
  graphics: Phaser.GameObjects.Graphics,
  box: BrainBox,
  lit: number,
  arriving: number,
): void {
  graphics.clear();

  const written = writtenNodeCount();

  const point = (fraction: { x: number; y: number }) => ({
    x: box.left + fraction.x * box.width,
    y: box.top + fraction.y * box.height,
  });

  // A container for the nodes rather than a picture of a brain: anything more
  // solid competes with the board.
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

  // So it reads as a brain rather than a cloud.
  const stemTop = point({ x: 0.5, y: 0.86 });
  const stemEnd = point({ x: 0.46, y: 1.0 });
  graphics.lineStyle(4, TRACK_COLOR, 0.85);
  graphics.lineBetween(stemTop.x, stemTop.y, stemEnd.x, stemEnd.y);

  // Before the nodes, so they sit on top.
  for (let index = 1; index < Math.min(BRAIN_NODE_SLOTS, written); index += 1) {
    const from = brainNodeAt(index - 1, box);
    const to = brainNodeAt(index, box);
    const earned = index < lit;

    graphics.lineStyle(earned ? 2 : 1, earned ? TRACK_LIT_COLOR : TRACK_COLOR, earned ? 0.75 : 0.3);
    graphics.lineBetween(from.x, from.y, to.x, to.y);
  }

  // Only the nodes that exist.
  for (let index = 0; index < Math.min(BRAIN_NODE_SLOTS, written); index += 1) {
    const at = brainNodeAt(index, box);
    const earned = index < lit;
    const isArriving = index === lit && arriving > 0;
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
