import { describe, expect, it } from 'vitest';
import {
  CELL_SATELLITES,
  SKY_TENDRILS,
  SKY_TWIGS,
  SPARK_LIFE,
  WALK_SPEED,
  advanceSparks,
  ambientPulseAt,
  driftingStars,
  seededRandom,
  sparkSample,
  spawnSparks,
  standingAt,
  trunkLift,
  walkAfter,
} from './sky-life';
import { SKY_CELLS, SKY_HEIGHT, SKY_TRUNK, SKY_WIDTH } from './sky';
import { FRAGMENT_COUNT } from './memories';
import { VICTORY_TEXT_AND_BUTTONS } from './victory-layout';

const free = ([x, y]: readonly [number, number]): boolean => x > 12
  && x < SKY_WIDTH - 12
  && y > 12
  && y < SKY_HEIGHT - 74
  && VICTORY_TEXT_AND_BUTTONS.every((rect) => !(x > rect.left && x < rect.right && y > rect.top && y < rect.bottom));

describe('seededRandom', () => {
  it('gives the same sequence for the same seed', () => {
    const first = seededRandom(1987);
    const second = seededRandom(1987);

    expect([first(), first(), first()]).toEqual([second(), second(), second()]);
  });

  it('stays between zero and one', () => {
    const next = seededRandom(7);

    for (let draw = 0; draw < 500; draw += 1) {
      const value = next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('the twigs growing off the trunk', () => {
  it('start on the trunk, or on the twig they branch from', () => {
    for (const twig of SKY_TWIGS) {
      const [startX, startY] = twig.points[0];
      const onTrunk = SKY_TRUNK.some((sample) => Math.hypot(sample.x - startX, sample.y - startY) < 1);
      const onParent = SKY_TWIGS.some((other) => other !== twig
        && other.depth === twig.depth - 1
        && other.points.some(([x, y]) => x === startX && y === startY));

      expect(twig.depth === 0 ? onTrunk : onParent).toBe(true);
    }
  });

  it('know where along the route they grow, so they only show where the trunk does', () => {
    for (const twig of SKY_TWIGS) {
      expect(twig.along).toBeGreaterThanOrEqual(0);
      expect(twig.along).toBeLessThanOrEqual(FRAGMENT_COUNT - 1);
    }
  });

  it('stay on the canvas, clear of the text and buttons', () => {
    for (const twig of SKY_TWIGS) {
      expect(twig.points.length).toBeGreaterThan(2);
      for (const point of twig.points) {
        expect(free(point), `${point}`).toBe(true);
      }
    }
  });
});

describe('the tendrils off the newest memory', () => {
  it('reach out from it in three directions, still clear of the text and buttons', () => {
    expect(SKY_TENDRILS).toHaveLength(3);
    for (const tendril of SKY_TENDRILS) {
      expect(tendril[0]).toEqual([SKY_CELLS[0].x, SKY_CELLS[0].y]);
      expect(tendril.length).toBeGreaterThan(3);
      for (const point of tendril.slice(1)) {
        expect(free(point), `${point}`).toBe(true);
      }
    }
  });
});

describe('the dots around each cell', () => {
  it('give every cell three, each a short reach away', () => {
    expect(CELL_SATELLITES).toHaveLength(SKY_CELLS.length);
    for (const dots of CELL_SATELLITES) {
      expect(dots).toHaveLength(3);
      for (const { dx, dy } of dots) {
        expect(Math.hypot(dx, dy)).toBeGreaterThanOrEqual(20);
        expect(Math.hypot(dx, dy)).toBeLessThanOrEqual(36);
      }
    }
  });
});

describe('the swell near the pointer', () => {
  it('is full at the pointer and gone beyond its reach', () => {
    const sample = SKY_TRUNK[40];

    expect(trunkLift(sample, { x: sample.x, y: sample.y })).toBe(1);
    expect(trunkLift(sample, { x: sample.x + 35, y: sample.y })).toBeCloseTo(0.5, 5);
    expect(trunkLift(sample, { x: sample.x + 200, y: sample.y })).toBe(0);
  });

  it('is nothing without a pointer', () => {
    expect(trunkLift(SKY_TRUNK[40], null)).toBe(0);
  });
});

describe('the sparks the pointer sends along the trunk', () => {
  it('start as a pair, one towards the newest memory and one towards the oldest', () => {
    const pair = spawnSparks(60);

    expect(pair.map((spark) => spark.direction).sort()).toEqual([-1, 1]);
    for (const spark of pair) {
      expect(spark.at).toBe(60);
      expect(spark.life).toBe(1);
    }
  });

  it('travel along the trunk in their own direction as time passes', () => {
    const [back, forward] = spawnSparks(60).sort((a, b) => a.direction - b.direction);
    const [movedBack, movedForward] = advanceSparks([back, forward], 100);

    expect(movedBack.at).toBeLessThan(60);
    expect(movedForward.at).toBeGreaterThan(60);
    expect(movedForward.life).toBeLessThan(1);
  });

  it('leave the original sparks as they were', () => {
    const sparks = spawnSparks(60);
    advanceSparks(sparks, 100);

    expect(sparks.every((spark) => spark.at === 60 && spark.life === 1)).toBe(true);
  });

  it('are dropped once they fade or run off either end of the trunk', () => {
    expect(advanceSparks(spawnSparks(60), SPARK_LIFE * 2)).toEqual([]);
    expect(advanceSparks(spawnSparks(0), 50)).toHaveLength(1);
    expect(advanceSparks(spawnSparks(SKY_TRUNK.length - 1), 50)).toHaveLength(1);
  });

  it('are drawn from a real sample of the trunk', () => {
    const [spark] = spawnSparks(60);

    expect(sparkSample({ ...spark, at: 60.7 })).toBe(SKY_TRUNK[60]);
  });
});

describe('the lights that drift along the trunk by themselves', () => {
  it('stay on the trunk', () => {
    for (let time = 0; time < 60000; time += 997) {
      for (let light = 0; light < 3; light += 1) {
        const at = ambientPulseAt(time, light, 3);

        expect(at).toBeGreaterThanOrEqual(0);
        expect(at).toBeLessThanOrEqual(SKY_TRUNK.length - 1);
      }
    }
  });

  it('keep their distance from each other', () => {
    const [first, second, third] = [0, 1, 2].map((light) => ambientPulseAt(5000, light, 3));

    expect(new Set([first, second, third]).size).toBe(3);
  });
});

describe('the cowboy walking the trunk', () => {
  const everywhere = (): boolean => true;

  it('starts out standing still, facing forward', () => {
    expect(standingAt(40)).toEqual({ at: 40, facing: 1, walking: false });
  });

  it('walks towards a target further along at a steady pace, facing that way', () => {
    const walker = walkAfter(standingAt(40), 100, 100, everywhere);

    expect(walker.at).toBeCloseTo(40 + 100 * WALK_SPEED, 5);
    expect(walker.facing).toBe(1);
    expect(walker.walking).toBe(true);
  });

  it('turns round to walk back the other way', () => {
    const walker = walkAfter(standingAt(100), 40, 100, everywhere);

    expect(walker.at).toBeCloseTo(100 - 100 * WALK_SPEED, 5);
    expect(walker.facing).toBe(-1);
  });

  it('keeps facing the way he last walked once he stops', () => {
    const arrived = walkAfter(walkAfter(standingAt(100), 40, 100, everywhere), 40, 100000, everywhere);

    expect(arrived.walking).toBe(false);
    expect(arrived.facing).toBe(-1);
  });

  it('stops on the target without overshooting it', () => {
    const arrived = walkAfter(standingAt(40), 42, 100000, everywhere);

    expect(arrived.at).toBe(42);
    expect(arrived.walking).toBe(false);
  });

  it('stays put when he is already there', () => {
    expect(walkAfter(standingAt(40), 40, 100, everywhere)).toEqual(standingAt(40));
  });

  it('hops over an unlit stretch instead of walking across it', () => {
    const lit = (sample: number): boolean => sample < 60 || sample > 90;
    const hopped = walkAfter(standingAt(58), 120, 100, lit);

    expect(hopped.at).toBe(91);
    expect(hopped.walking).toBe(true);
    expect(hopped.facing).toBe(1);
  });

  it('hops backwards over an unlit stretch too', () => {
    const lit = (sample: number): boolean => sample < 60 || sample > 90;
    const hopped = walkAfter(standingAt(93), 10, 100, lit);

    expect(hopped.at).toBe(59);
    expect(hopped.facing).toBe(-1);
  });

  it('never stands on an unlit sample part-way through a step', () => {
    const lit = (sample: number): boolean => sample < 60 || sample > 90;
    const hopped = walkAfter(standingAt(59.4), 120, 2, lit);

    expect(lit(Math.round(hopped.at))).toBe(true);
  });

  it('does not hop when the whole way is lit', () => {
    const lit = (sample: number): boolean => sample < 60 || sample > 90;
    const stepped = walkAfter(standingAt(10), 50, 100, lit);

    expect(stepped.at).toBeCloseTo(10 + 100 * WALK_SPEED, 5);
  });
});

describe('the stars drifting behind the tree', () => {
  it('stays on the screen as it drifts', () => {
    for (const time of [0, 5000, 61000, 987654]) {
      for (const star of driftingStars(time)) {
        expect(star.x).toBeGreaterThanOrEqual(0);
        expect(star.x).toBeLessThanOrEqual(SKY_WIDTH);
        expect(star.y).toBeGreaterThanOrEqual(0);
        expect(star.y).toBeLessThanOrEqual(SKY_HEIGHT);
      }
    }
  });

  it('is the same sky at the same moment', () => {
    expect(driftingStars(777)).toEqual(driftingStars(777));
  });
});
