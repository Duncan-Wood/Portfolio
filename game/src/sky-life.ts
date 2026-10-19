import { SKY_CELLS, SKY_HEIGHT, SKY_TRUNK, SKY_WIDTH, type SkyPoint, type TrunkSample } from './sky';
import { VICTORY_TEXT_AND_BUTTONS } from './victory-layout';

export interface Twig {
  along: number;
  points: readonly (readonly [number, number])[];
  depth: number;
}

export interface Spark {
  at: number;
  direction: -1 | 1;
  life: number;
}

export interface Walker {
  at: number;
  facing: -1 | 1;
  walking: boolean;
}

export type Tendril = readonly (readonly [number, number])[];

export const WALK_SPEED = 0.045;
export const SPARK_LIFE = 1250;
export const SPARK_REACH = 55;
export const SPARK_GAP = 320;
export const LIFT_REACH = 70;

const SEED = 1987;
const SPARK_SPEED = 0.035;
const AMBIENT_SPEED = 0.00005;
const TWIG_STEP = 7;
const TWIG_EVERY = 11;
const TWIG_ODDS = 0.72;
const TENDRIL_STEP = 10;
const TENDRIL_HEADINGS: readonly (readonly [number, number])[] = [[Math.PI, 9], [Math.PI * 0.84, 7], [Math.PI * 1.17, 8]];
const SATELLITES_PER_CELL = 3;
const MARGIN = 12;
const FLOOR = SKY_HEIGHT - 74;

export function seededRandom(seed: number): () => number {
  let state = seed;

  return () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
}

const free = (x: number, y: number): boolean => x > MARGIN
  && x < SKY_WIDTH - MARGIN
  && y > MARGIN
  && y < FLOOR
  && VICTORY_TEXT_AND_BUTTONS.every((rect) => !(x > rect.left && x < rect.right && y > rect.top && y < rect.bottom));

const random = seededRandom(SEED);

function growTwigs(): Twig[] {
  const twigs: Twig[] = [];

  const grow = (fromX: number, fromY: number, heading: number, steps: number, depth: number, along: number): void => {
    const points: [number, number][] = [[fromX, fromY]];
    let [x, y] = [fromX, fromY];
    let angle = heading;

    for (let step = 0; step < steps; step += 1) {
      angle += (random() - 0.5) * 0.7;
      x += Math.cos(angle) * TWIG_STEP;
      y += Math.sin(angle) * TWIG_STEP;
      if (!free(x, y)) {
        break;
      }
      points.push([x, y]);
      if (depth < 2 && step > 1 && random() < 0.22) {
        grow(x, y, angle + (random() < 0.5 ? 0.7 : -0.7), Math.floor(steps * 0.6), depth + 1, along);
      }
    }

    if (points.length > 2) {
      twigs.push({ along, points, depth });
    }
  };

  for (let at = 8; at < SKY_TRUNK.length - 8; at += TWIG_EVERY) {
    const [from, to]: TrunkSample[] = [SKY_TRUNK[at], SKY_TRUNK[at + 1]];
    const side = random() < 0.5 ? 1 : -1;
    const heading = Math.atan2(to.y - from.y, to.x - from.x) + side * (1 + random() * 0.5);

    if (random() < TWIG_ODDS) {
      grow(from.x, from.y, heading, 5 + Math.floor(random() * 5), 0, from.along);
    }
  }

  return twigs;
}

function growTendrils(): Tendril[] {
  const start = SKY_CELLS[0];

  return TENDRIL_HEADINGS.map(([heading, steps]) => {
    const points: [number, number][] = [[start.x, start.y]];
    let [x, y] = [start.x, start.y];
    let angle = heading;

    for (let step = 0; step < steps; step += 1) {
      angle += (random() - 0.5) * 0.55;
      x += Math.cos(angle) * TENDRIL_STEP;
      y += Math.sin(angle) * TENDRIL_STEP;
      if (!free(x, y)) {
        break;
      }
      points.push([x, y]);
    }

    return points;
  });
}

export const SKY_TWIGS: readonly Twig[] = growTwigs();
export const SKY_TENDRILS: readonly Tendril[] = growTendrils();

export const CELL_SATELLITES: readonly (readonly { dx: number; dy: number }[])[] = SKY_CELLS.map(() => Array.from(
  { length: SATELLITES_PER_CELL },
  () => {
    const angle = random() * Math.PI * 2;
    const reach = 20 + random() * 16;

    return { dx: Math.cos(angle) * reach, dy: Math.sin(angle) * reach };
  },
));

export function trunkLift(sample: SkyPoint, pointer: SkyPoint | null): number {
  if (pointer === null) {
    return 0;
  }

  return Math.max(0, 1 - Math.hypot(sample.x - pointer.x, sample.y - pointer.y) / LIFT_REACH);
}

export function spawnSparks(at: number): Spark[] {
  return [
    { at, direction: -1, life: 1 },
    { at, direction: 1, life: 1 },
  ];
}

export function advanceSparks(sparks: readonly Spark[], elapsed: number): Spark[] {
  return sparks
    .map((spark) => ({
      ...spark,
      at: spark.at + spark.direction * elapsed * SPARK_SPEED,
      life: spark.life - elapsed / SPARK_LIFE,
    }))
    .filter((spark) => spark.life > 0 && spark.at >= 0 && spark.at <= SKY_TRUNK.length - 1);
}

export function sparkSample(spark: Spark): TrunkSample {
  return SKY_TRUNK[Math.floor(spark.at)];
}

export function ambientPulseAt(time: number, light: number, lights: number): number {
  return Math.floor((((time * AMBIENT_SPEED) + light / lights) % 1) * (SKY_TRUNK.length - 1));
}

export function standingAt(at: number): Walker {
  return { at, facing: 1, walking: false };
}

export function walkAfter(walker: Walker, target: number, elapsed: number): Walker {
  const gap = target - walker.at;
  if (gap === 0) {
    return walker;
  }

  const direction = gap > 0 ? 1 : -1;
  const step = Math.min(Math.abs(gap), elapsed * WALK_SPEED);
  const at = step === Math.abs(gap) ? target : walker.at + direction * step;

  return { at, facing: direction, walking: at !== target };
}
