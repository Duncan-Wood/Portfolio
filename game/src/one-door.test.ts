import { describe, expect, it } from 'vitest';
import {
  DOOR_COLUMNS,
  DOOR_LEFT,
  DOOR_RIGHT,
  DOOR_ROWS,
  FILE_KINDS,
  FLOOR_ROW,
  PAGE,
  STILL_MOMENT,
  STREAM_LOOP,
  doorwayScene,
  drawDoor,
  drawDoorway,
} from './one-door';

const sameShape = (a: typeof PAGE, b: typeof PAGE): boolean => JSON.stringify(a) === JSON.stringify(b);

describe('what goes through the door', () => {
  it('takes in files of more than one kind', () => {
    expect(FILE_KINDS.length).toBeGreaterThan(3);
  });

  it('never takes in two kinds of file that look alike', () => {
    FILE_KINDS.forEach((kind, index) => {
      FILE_KINDS.slice(index + 1).forEach((other) => {
        expect(sameShape(kind, other)).toBe(false);
      });
    });
  });

  it('gives back a page unlike anything it was handed', () => {
    for (const kind of FILE_KINDS) {
      expect(sameShape(kind, PAGE)).toBe(false);
    }
  });

  it('keeps every part of a file inside the file', () => {
    for (const design of [...FILE_KINDS, PAGE]) {
      for (const part of design.parts) {
        expect(part.column).toBeGreaterThanOrEqual(0);
        expect(part.row).toBeGreaterThanOrEqual(0);
        expect(part.column + part.width).toBeLessThanOrEqual(design.width);
        expect(part.row + part.height).toBeLessThanOrEqual(design.height);
      }
    }
  });

  it('keeps every file short enough to fit through the doorway', () => {
    for (const design of [...FILE_KINDS, PAGE]) {
      expect(design.height).toBeLessThan(FLOOR_ROW);
    }
  });
});

describe('the stream through the door', () => {
  const moments = Array.from({ length: 60 }, (_, step) => step * 97);

  it('keeps files on the near side of the door and pages on the far side', () => {
    for (const moment of moments) {
      for (const shape of doorwayScene(moment)) {
        if (shape.side === 'file') {
          expect(shape.column + shape.width).toBeLessThanOrEqual(DOOR_LEFT);
        } else {
          expect(shape.column).toBeGreaterThanOrEqual(DOOR_RIGHT);
        }
      }
    }
  });

  it('keeps everything on the board it is drawn on', () => {
    for (const moment of moments) {
      for (const shape of doorwayScene(moment)) {
        expect(shape.column).toBeGreaterThanOrEqual(0);
        expect(shape.column + shape.width).toBeLessThanOrEqual(DOOR_COLUMNS);
        expect(shape.row).toBeGreaterThanOrEqual(0);
        expect(shape.row + shape.height).toBeLessThanOrEqual(FLOOR_ROW);
        expect(shape.width).toBeGreaterThan(0);
        expect(shape.height).toBeGreaterThan(0);
      }
    }
  });

  it('has something going in and something coming out at every moment', () => {
    for (const moment of moments) {
      const sides = new Set(doorwayScene(moment).map((shape) => shape.side));

      expect(sides).toEqual(new Set(['file', 'page']));
    }
  });

  it('keeps going forever, repeating once every kind has been through', () => {
    for (const moment of moments) {
      expect(doorwayScene(moment + STREAM_LOOP)).toEqual(doorwayScene(moment));
    }
  });
});

describe('drawing the door', () => {
  it('fills exactly the size asked for', () => {
    for (const [columns, rows] of [[DOOR_COLUMNS, DOOR_ROWS], [22, 16]]) {
      const door = drawDoor(columns, rows, STILL_MOMENT);

      expect(door.columns).toBe(columns);
      expect(door.rows).toHaveLength(rows);
      for (const row of door.rows) {
        expect(row).toHaveLength(columns);
      }
    }
  });

  it('uses only marks the art baker knows how to colour', () => {
    for (const row of drawDoor(DOOR_COLUMNS, DOOR_ROWS, STILL_MOMENT).rows) {
      expect(row).toMatch(/^[.0-7]+$/);
    }
  });

  it('draws the doorway alone when nothing is passing through', () => {
    const doorway = drawDoorway(DOOR_COLUMNS, DOOR_ROWS);
    const door = drawDoor(DOOR_COLUMNS, DOOR_ROWS, STILL_MOMENT);

    expect(door).not.toEqual(doorway);
    expect(drawDoorway(DOOR_COLUMNS, DOOR_ROWS)).toEqual(doorway);
  });
});
