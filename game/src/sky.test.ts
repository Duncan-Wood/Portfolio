import { describe, expect, it } from 'vitest';
import {
  CELL_SAMPLE,
  SKY_CELLS,
  SKY_HEIGHT,
  SKY_ROUTE,
  SKY_TRUNK,
  SKY_WIDTH,
  labelSpot,
  litRoute,
  nearestTrunkSample,
  pictureFrameOf,
  placeOf,
  routeCovers,
  starOf,
  trunkWidth,
} from './sky';
import { CHAPTERS, FRAGMENT_COUNT, collectionEntries } from './memories';
import { MEMORY_PICTURES } from './memory-pictures';
import { VICTORY_TEXT_AND_BUTTONS, type Rect } from './victory-layout';

const PLACE_OF_CHAPTER: Readonly<Record<string, string>> = {
  Now: 'THE DMV',
  'Washington, DC': 'THE DMV',
  Florida: 'FLORIDA',
  Illinois: 'ILLINOIS',
};

const CHARACTER_WIDTH = 7.2;

const inside = (rect: Rect, x: number, y: number): boolean => x > rect.left && x < rect.right && y > rect.top && y < rect.bottom;

const overlaps = (a: Rect, b: Rect): boolean => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

describe('the cells on the sky', () => {
  it('has one for every memory', () => {
    expect(SKY_CELLS).toHaveLength(FRAGMENT_COUNT);
  });

  it('keeps every cell on the canvas with room for its glow', () => {
    for (const { x, y } of SKY_CELLS) {
      expect(x).toBeGreaterThan(40);
      expect(x).toBeLessThan(SKY_WIDTH - 40);
      expect(y).toBeGreaterThan(40);
      expect(y).toBeLessThan(SKY_HEIGHT - 40);
    }
  });

  it('keeps two cells apart so each can be picked on its own', () => {
    SKY_CELLS.forEach((first, at) => {
      SKY_CELLS.slice(at + 1).forEach((second) => {
        expect(Math.hypot(first.x - second.x, first.y - second.y)).toBeGreaterThan(60);
      });
    });
  });

  it('keeps every cell clear of the title, the line of text and the buttons', () => {
    for (const { x, y } of SKY_CELLS) {
      for (const rect of VICTORY_TEXT_AND_BUTTONS) {
        expect(inside(rect, x, y)).toBe(false);
      }
    }
  });

  it('gives no memory a star other than its own cell', () => {
    SKY_CELLS.forEach((cell, index) => {
      expect(starOf(index)).toEqual(cell);
    });
  });
});

describe('the places on the sky', () => {
  it('keeps each memory in the place its chapter came from', () => {
    const chapterOfMemory = CHAPTERS.flatMap((chapter) => chapter.nodes.map(() => chapter.title));

    chapterOfMemory.forEach((title, index) => {
      expect(placeOf(index), `${title} memory ${index}`).toBe(PLACE_OF_CHAPTER[title]);
    });
  });

  it('keeps Illinois to the west, the DMV to the north east and Florida below the DMV', () => {
    const centreOf = (place: string) => {
      const cells = SKY_CELLS.filter((_, index) => placeOf(index) === place);
      return {
        x: cells.reduce((total, { x }) => total + x, 0) / cells.length,
        y: cells.reduce((total, { y }) => total + y, 0) / cells.length,
      };
    };

    expect(centreOf('THE DMV').x).toBeGreaterThan(centreOf('ILLINOIS').x);
    expect(centreOf('FLORIDA').x).toBeGreaterThan(centreOf('ILLINOIS').x);
    expect(centreOf('FLORIDA').y).toBeGreaterThan(centreOf('THE DMV').y);
  });
});

describe('the trunk', () => {
  it('starts at the newest memory and ends at the oldest', () => {
    expect(SKY_TRUNK[0]).toMatchObject({ x: SKY_CELLS[0].x, y: SKY_CELLS[0].y, along: 0 });
    expect(SKY_TRUNK[SKY_TRUNK.length - 1]).toMatchObject({
      x: SKY_CELLS[FRAGMENT_COUNT - 1].x,
      y: SKY_CELLS[FRAGMENT_COUNT - 1].y,
      along: FRAGMENT_COUNT - 1,
    });
  });

  it('passes through every cell', () => {
    SKY_CELLS.forEach((cell, index) => {
      const closest = Math.min(...SKY_TRUNK.map((sample) => Math.hypot(sample.x - cell.x, sample.y - cell.y)));
      expect(closest, `memory ${index}`).toBeLessThan(1);
    });
  });

  it('runs in unlock order, never doubling back along the route', () => {
    SKY_TRUNK.slice(1).forEach((sample, index) => {
      expect(sample.along).toBeGreaterThanOrEqual(SKY_TRUNK[index].along);
    });
  });

  it('stays on the canvas and out from behind the text and buttons', () => {
    for (const { x, y } of SKY_TRUNK) {
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(SKY_WIDTH);
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(SKY_HEIGHT);
      for (const rect of VICTORY_TEXT_AND_BUTTONS) {
        expect(inside(rect, x, y), `${x},${y}`).toBe(false);
      }
    }
  });

  it('thins from the newest memory to the oldest without vanishing', () => {
    expect(trunkWidth(0)).toBeGreaterThan(trunkWidth(FRAGMENT_COUNT - 1));
    expect(trunkWidth(FRAGMENT_COUNT - 1)).toBeGreaterThan(0.5);
  });

  it('has a sample at every cell, which is where that memory’s cowboy stands', () => {
    expect(CELL_SAMPLE).toHaveLength(FRAGMENT_COUNT);
    CELL_SAMPLE.forEach((at, index) => {
      expect(SKY_TRUNK[at].x).toBe(SKY_CELLS[index].x);
      expect(SKY_TRUNK[at].y).toBe(SKY_CELLS[index].y);
    });
  });

  it('finds the part of the trunk near a point, and nothing far from it', () => {
    const cell = SKY_CELLS[3];
    const found = nearestTrunkSample(cell, 55);

    expect(found).not.toBe(-1);
    expect(Math.abs(SKY_TRUNK[found].along - 3)).toBeLessThan(0.1);
    expect(nearestTrunkSample({ x: 310, y: 330 }, 55)).toBe(-1);
  });
});

describe('the label beside a selected cell', () => {
  const widthOf = (index: number) => placeOf(index).length * CHARACTER_WIDTH;

  it('stays on the canvas and clear of the text and buttons for every memory', () => {
    SKY_CELLS.forEach((_, index) => {
      const spot = labelSpot(index, widthOf(index));
      const box = { left: spot.left, top: spot.top, right: spot.left + widthOf(index), bottom: spot.top + 14 };

      expect(box.left, `memory ${index}`).toBeGreaterThan(0);
      expect(box.right, `memory ${index}`).toBeLessThan(SKY_WIDTH);
      for (const rect of VICTORY_TEXT_AND_BUTTONS) {
        expect(overlaps(box, rect), `memory ${index}`).toBe(false);
      }
    });
  });

  it('stays next to its own cell', () => {
    SKY_CELLS.forEach((cell, index) => {
      const spot = labelSpot(index, widthOf(index));

      expect(Math.abs(spot.left + widthOf(index) / 2 - cell.x), `memory ${index}`).toBeLessThan(widthOf(index) / 2 + 40);
      expect(Math.abs(spot.top - cell.y), `memory ${index}`).toBeLessThan(50);
    });
  });
});

describe('the picture behind a selected cell', () => {
  it('exists for every memory, from the card’s own art', () => {
    collectionEntries().forEach((entry, index) => {
      expect(MEMORY_PICTURES[entry.photo!], `memory ${index}`).toBeDefined();
    });
  });

  it('keeps its shape and stays on the canvas around the cell', () => {
    collectionEntries().forEach((entry, index) => {
      const frame = pictureFrameOf(index);
      const art = MEMORY_PICTURES[entry.photo!];
      const cell = starOf(index);

      expect((frame.bottom - frame.top) / (frame.right - frame.left)).toBeCloseTo(art.rows.length / art.columns, 5);
      expect(frame.left).toBeGreaterThanOrEqual(0);
      expect(frame.right).toBeLessThanOrEqual(SKY_WIDTH);
      expect(frame.top).toBeGreaterThanOrEqual(0);
      expect(frame.bottom).toBeLessThanOrEqual(SKY_HEIGHT);
      expect(cell.x).toBeGreaterThan(frame.left);
      expect(cell.x).toBeLessThan(frame.right);
      expect(cell.y).toBeGreaterThan(frame.top);
      expect(cell.y).toBeLessThan(frame.bottom);
    });
  });
});

describe('the route a run took', () => {
  it('runs through the memories in the order they unlock', () => {
    expect(SKY_ROUTE).toHaveLength(FRAGMENT_COUNT - 1);
    SKY_ROUTE.forEach(([from, to], index) => {
      expect(from).toBe(index);
      expect(to).toBe(index + 1);
    });
  });

  it('draws none before anything is found', () => {
    expect(litRoute([])).toEqual([]);
  });

  it('leaves a gap where one end has not been found', () => {
    expect(litRoute([0])).toEqual([]);
    expect(litRoute([0, 1])).toEqual([[0, 1]]);
    expect(litRoute([0, 2])).toEqual([]);
  });

  it('covers the stretch of trunk between two found memories and nothing else', () => {
    expect(routeCovers([0, 1], 0.5)).toBe(true);
    expect(routeCovers([0, 1], 1.5)).toBe(false);
    expect(routeCovers([0, 1, 2], 1.5)).toBe(true);
    expect(routeCovers([0, 2], 1)).toBe(false);
    expect(routeCovers([], 0)).toBe(false);
  });

  it('covers the swing along the bottom once both memories on either side are found', () => {
    expect(routeCovers([6, 7], 6.5)).toBe(true);
    expect(routeCovers([6], 6.5)).toBe(false);
  });

  it('joins the whole sky once everything is found', () => {
    const everything = SKY_CELLS.map((_, index) => index);

    expect(litRoute(everything)).toEqual([...SKY_ROUTE]);
  });
});
