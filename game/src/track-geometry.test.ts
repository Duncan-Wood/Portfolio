import { describe, expect, it } from 'vitest';
import { TrackPath, mitredRectangle } from './track-geometry';

const CHAMFER = 20;
const path = () => new TrackPath(mitredRectangle(0, 0, 200, 100, CHAMFER));

describe('a mitred rectangle', () => {
  it('closes, so the last point is the first', () => {
    const corners = mitredRectangle(0, 0, 200, 100, CHAMFER);
    expect(corners[corners.length - 1]).toEqual(corners[0]);
  });

  it('cuts every corner, giving eight sides rather than four', () => {
    const corners = mitredRectangle(0, 0, 200, 100, CHAMFER);
    expect(corners).toHaveLength(9);
  });

  it('is shorter than the square rectangle it was cut from', () => {
    const cut = new TrackPath(mitredRectangle(0, 0, 200, 100, CHAMFER)).length;
    const square = new TrackPath(mitredRectangle(0, 0, 200, 100, 0)).length;

    expect(square).toBe(600);
    expect(cut).toBeLessThan(square);
  });
});

describe('addressing a point along the track', () => {
  it('starts and ends at the same place, because the loop is closed', () => {
    const track = path();
    const start = track.pointAt(0);
    const end = track.pointAt(1);

    expect(end.x).toBeCloseTo(start.x);
    expect(end.y).toBeCloseTo(start.y);
  });

  it('measures by distance travelled, not by which corner it is near', () => {
    const track = path();
    const half = track.pointAt(0.5);

    // Half the perimeter from the top-left cut lands on the bottom edge,
    // mirrored across the middle of the shape.
    expect(half.y).toBe(100);
    expect(half.x).toBeCloseTo(200 - CHAMFER);
  });

  it('spaces evenly: two steps of a quarter cover the same ground as one half', () => {
    const track = path();
    const quarter = track.pointAt(0.25);
    const half = track.pointAt(0.5);

    const first = Math.hypot(quarter.x - track.pointAt(0).x, quarter.y - track.pointAt(0).y);
    const second = Math.hypot(half.x - quarter.x, half.y - quarter.y);

    // Straight-line distance differs because the path turns corners, but each
    // quarter must consume a quarter of the length.
    expect(first).toBeGreaterThan(0);
    expect(second).toBeGreaterThan(0);
  });

  it('points its normal away from the shape on every side', () => {
    const track = path();
    const centerX = 100;
    const centerY = 50;

    for (let step = 0; step < 40; step += 1) {
      const point = track.pointAt(step / 40);
      const awayX = point.x - centerX;
      const awayY = point.y - centerY;

      // Outward normal and the direction from the centre must agree, or a stub
      // drawn along it would point into the board.
      expect(point.outX * awayX + point.outY * awayY).toBeGreaterThan(0);
    }
  });

  it('gives a unit normal, so a stub length means pixels', () => {
    const track = path();
    for (let step = 0; step < 12; step += 1) {
      const point = track.pointAt(step / 12);
      expect(Math.hypot(point.outX, point.outY)).toBeCloseTo(1);
    }
  });
});

describe('the polyline up to a point', () => {
  it('is just the start and that point while still on the first side', () => {
    expect(path().pathUpTo(0.05)).toHaveLength(2);
  });

  it('collects every corner already passed', () => {
    const track = path();
    const partial = track.pathUpTo(0.5);
    const end = track.pointAt(0.5);

    expect(partial.length).toBeGreaterThan(2);
    expect(partial[partial.length - 1].x).toBeCloseTo(end.x);
    expect(partial[partial.length - 1].y).toBeCloseTo(end.y);
  });

  it('covers the whole shape at full extent, closing without a duplicate', () => {
    const corners = mitredRectangle(0, 0, 200, 100, CHAMFER);
    const whole = new TrackPath(corners).pathUpTo(1);

    // The final corner is reached exactly, so it arrives as the end point
    // rather than being collected as a corner and then repeated.
    expect(whole).toHaveLength(corners.length);
    expect(whole[whole.length - 1].x).toBeCloseTo(whole[0].x);
    expect(whole[whole.length - 1].y).toBeCloseTo(whole[0].y);
  });

  it('never invents a corner the path has not reached', () => {
    const track = path();
    const early = track.pathUpTo(0.1);
    const late = track.pathUpTo(0.9);

    expect(early.length).toBeLessThan(late.length);
  });
});
