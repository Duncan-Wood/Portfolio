import { describe, expect, it } from 'vitest';
import { SKY_EDGES, SKY_POINTS, litEdges } from './sky';
import { FRAGMENT_COUNT } from './memories';

describe('the sky', () => {
  it('has a place for every memory', () => {
    expect(SKY_POINTS).toHaveLength(FRAGMENT_COUNT);
  });

  it('keeps every star inside the frame it is drawn in', () => {
    for (const point of SKY_POINTS) {
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(1);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThanOrEqual(1);
    }
  });

  it('gives no two stars the same place', () => {
    const places = new Set(SKY_POINTS.map((point) => `${point.x},${point.y}`));

    expect(places.size).toBe(SKY_POINTS.length);
  });

  it('draws every line between two stars that exist', () => {
    for (const [from, to] of SKY_EDGES) {
      expect(from).not.toBe(to);
      expect(SKY_POINTS[from]).toBeDefined();
      expect(SKY_POINTS[to]).toBeDefined();
    }
  });

  it('never draws the same line twice', () => {
    const drawn = new Set(SKY_EDGES.map(([from, to]) => [from, to].sort().join('-')));

    expect(drawn.size).toBe(SKY_EDGES.length);
  });

  it('reaches every star with a line, so none is left stranded', () => {
    const joined = new Set(SKY_EDGES.flat());

    expect(joined.size).toBe(SKY_POINTS.length);
  });
});

describe('the lines a run has earned', () => {
  it('draws none before anything is found', () => {
    expect(litEdges([])).toEqual([]);
  });

  it('leaves a gap where one end has not been found', () => {
    const [from, to] = SKY_EDGES[0];

    expect(litEdges([from])).toEqual([]);
    expect(litEdges([from, to])).toEqual([[from, to]]);
  });

  it('joins the whole sky once everything is found', () => {
    const everything = SKY_POINTS.map((_, index) => index);

    expect(litEdges(everything)).toEqual([...SKY_EDGES]);
  });
});
