/*
 * The shape of the progress track that rings the board, as pure geometry.
 *
 * No Phaser here, for the same reason `fixed-timestep.ts` has none: this is the
 * fiddliest arithmetic the presentation layer owns — arc-length
 * parameterisation, a segment scan, an outward normal — and inside `BoardScene`
 * nothing could reach it to test it, because importing that file drags in a
 * browser. The scene keeps the drawing; this keeps the maths.
 */

export interface TrackPoint {
  x: number;
  y: number;
  /** Unit vector square to the run, pointing away from the enclosed area. */
  outX: number;
  outY: number;
}

export interface Point {
  x: number;
  y: number;
}

/**
 * A rectangle with its corners cut off, as a closed polyline running clockwise
 * from the top-left cut.
 *
 * Mitred rather than square because a square corner reads as a border round the
 * board, and a cut one reads as routing that had to get somewhere.
 */
export function mitredRectangle(
  left: number,
  top: number,
  width: number,
  height: number,
  chamfer: number,
): Point[] {
  const right = left + width;
  const bottom = top + height;

  return [
    { x: left + chamfer, y: top },
    { x: right - chamfer, y: top },
    { x: right, y: top + chamfer },
    { x: right, y: bottom - chamfer },
    { x: right - chamfer, y: bottom },
    { x: left + chamfer, y: bottom },
    { x: left, y: bottom - chamfer },
    { x: left, y: top + chamfer },
    { x: left + chamfer, y: top },
  ];
}

/**
 * A closed polyline addressed by how far along it you are, from 0 to 1.
 *
 * Distances to each corner are measured once at construction, so asking for a
 * point is a scan over a handful of corners rather than anything trigonometric.
 */
export class TrackPath {
  private readonly distances: number[];

  readonly length: number;

  constructor(private readonly corners: readonly Point[]) {
    this.distances = [0];
    for (let index = 1; index < corners.length; index += 1) {
      const previous = corners[index - 1];
      const corner = corners[index];
      this.distances.push(
        this.distances[index - 1] + Math.hypot(corner.x - previous.x, corner.y - previous.y),
      );
    }

    this.length = this.distances[this.distances.length - 1];
  }

  /**
   * The point `fraction` of the way round, and the direction pointing outward
   * there.
   *
   * The outward normal is the clockwise perpendicular of the run, which is what
   * lets a caller branch a stub outward on any side without knowing which side
   * it is on.
   */
  pointAt(fraction: number): TrackPoint {
    const along = fraction * this.length;
    const segment = this.segmentAt(along);

    const from = this.corners[segment - 1];
    const to = this.corners[segment];
    const span = this.distances[segment] - this.distances[segment - 1];
    const progress = (along - this.distances[segment - 1]) / span;

    return {
      x: from.x + (to.x - from.x) * progress,
      y: from.y + (to.y - from.y) * progress,
      outX: (to.y - from.y) / span,
      outY: -(to.x - from.x) / span,
    };
  }

  /**
   * The polyline from the start up to `fraction`: every corner passed, then the
   * point itself.
   *
   * Exact, and as short as the shape allows. Sampling this at a fixed
   * resolution instead — which is what the first version did, 240 times — spends
   * roughly thirty vertices per corner to redraw the corner slightly wrong.
   */
  pathUpTo(fraction: number): Point[] {
    const along = fraction * this.length;
    const path: Point[] = [this.corners[0]];

    for (let index = 1; index < this.corners.length; index += 1) {
      if (this.distances[index] >= along) {
        break;
      }
      path.push(this.corners[index]);
    }

    const end = this.pointAt(fraction);
    path.push({ x: end.x, y: end.y });
    return path;
  }

  /** Which segment `along` falls in, as the index of the corner ending it. */
  private segmentAt(along: number): number {
    let segment = 1;
    while (segment < this.distances.length - 1 && this.distances[segment] < along) {
      segment += 1;
    }
    return segment;
  }
}
