import { describe, expect, it } from 'vitest';
import { SKY_ROUTE, insideRegion, litRoute, regionOf, starOf } from './sky';
import { SKY_MEMORIES, SKY_REGIONS } from './sky-layout';
import { CHAPTERS, FRAGMENT_COUNT } from './memories';

const PLACE_OF_CHAPTER: Readonly<Record<string, string>> = {
  Now: 'MARYLAND · DC · VIRGINIA',
  'Washington, DC': 'MARYLAND · DC · VIRGINIA',
  Florida: 'FLORIDA',
  Illinois: 'ILLINOIS',
};

describe('the sky', () => {
  it('has a place for every memory', () => {
    expect(SKY_MEMORIES).toHaveLength(FRAGMENT_COUNT);
  });

  it('keeps every neuron inside the frame it is drawn in', () => {
    for (const memory of SKY_MEMORIES) {
      for (const neuron of memory.neurons) {
        expect(neuron.x).toBeGreaterThanOrEqual(0);
        expect(neuron.x).toBeLessThanOrEqual(1);
        expect(neuron.y).toBeGreaterThanOrEqual(0);
        expect(neuron.y).toBeLessThanOrEqual(1);
      }
    }
  });

  it('gives no two memories the same star', () => {
    const places = new Set(SKY_MEMORIES.map((_, index) => `${starOf(index).x},${starOf(index).y}`));

    expect(places.size).toBe(SKY_MEMORIES.length);
  });

  it('joins every neuron of a memory to the rest of it', () => {
    for (const memory of SKY_MEMORIES) {
      expect(memory.main).toBeLessThan(memory.neurons.length);
      for (const [from, to] of memory.links) {
        expect(from).not.toBe(to);
        expect(memory.neurons[from]).toBeDefined();
        expect(memory.neurons[to]).toBeDefined();
      }
      expect(new Set(memory.links.flat()).size).toBe(memory.neurons.length);
    }
  });
});

describe('the places on the sky', () => {
  it('keeps each memory in the place its chapter came from', () => {
    const chapterOfMemory = CHAPTERS.flatMap((chapter) => chapter.nodes.map(() => chapter.title));

    chapterOfMemory.forEach((title, index) => {
      expect(regionOf(index).name, `${title} memory ${index}`).toBe(PLACE_OF_CHAPTER[title]);
    });
  });

  it('puts the Maryland, DC and Virginia region to the upper right of Illinois, with Florida below both', () => {
    const centreOf = (name: string) => {
      const points = SKY_REGIONS.find((region) => region.name === name)!.rings.flatMap((ring) => ring.points);
      return {
        x: points.reduce((total, [x]) => total + x, 0) / points.length,
        y: points.reduce((total, [, y]) => total + y, 0) / points.length,
      };
    };

    const illinois = centreOf('ILLINOIS');
    const capital = centreOf('MARYLAND · DC · VIRGINIA');
    const florida = centreOf('FLORIDA');

    expect(capital.x).toBeGreaterThan(illinois.x);
    expect(florida.y).toBeGreaterThan(illinois.y);
    expect(florida.y).toBeGreaterThan(capital.y);
  });

  it('keeps every memory’s star inside the outline of its own place', () => {
    SKY_MEMORIES.forEach((_, index) => {
      expect(insideRegion(starOf(index), regionOf(index)), `memory ${index}`).toBe(true);
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

  it('joins the whole sky once everything is found', () => {
    const everything = SKY_MEMORIES.map((_, index) => index);

    expect(litRoute(everything)).toEqual([...SKY_ROUTE]);
  });
});
