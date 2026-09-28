import { describe, expect, it } from 'vitest';
import {
  CUSTOMER_COUNT,
  MAP_PINS,
  MAP_THREADS,
  PIN_MARK,
  THREAD_MARK,
  drawMap,
  isLand,
  pinCell,
} from './customer-map';

describe('the customer map', () => {
  it('pins every one of the seventy customers', () => {
    expect(CUSTOMER_COUNT).toBe(70);
    expect(MAP_PINS).toHaveLength(CUSTOMER_COUNT);
  });

  it('keeps every pin on land', () => {
    for (const pin of MAP_PINS) {
      expect(isLand(pin)).toBe(true);
    }
  });

  it('gives no two pins the same place on the full-size picture', () => {
    const places = new Set(MAP_PINS.map((pin) => {
      const { column, row } = pinCell(pin, 110, 82);
      return `${column},${row}`;
    }));

    expect(places.size).toBe(MAP_PINS.length);
  });

  it('runs every thread between two pins that exist', () => {
    for (const [from, to] of MAP_THREADS) {
      expect(from).not.toBe(to);
      expect(MAP_PINS[from]).toBeDefined();
      expect(MAP_PINS[to]).toBeDefined();
    }
  });

  it('threads every pin to the rest, so none is left stranded', () => {
    const joined = new Set([0]);
    let grew = true;

    while (grew) {
      grew = false;
      for (const [from, to] of MAP_THREADS) {
        if (joined.has(from) !== joined.has(to)) {
          joined.add(from);
          joined.add(to);
          grew = true;
        }
      }
    }

    expect(joined.size).toBe(MAP_PINS.length);
  });
});

describe('drawing the customer map', () => {
  it('fills exactly the size asked for', () => {
    for (const [columns, rows] of [[110, 82], [22, 16]]) {
      const map = drawMap(columns, rows);

      expect(map.columns).toBe(columns);
      expect(map.rows).toHaveLength(rows);
      for (const row of map.rows) {
        expect(row).toHaveLength(columns);
      }
    }
  });

  it('uses only marks the art baker knows how to colour', () => {
    for (const row of drawMap(110, 82).rows) {
      expect(row).toMatch(/^[.0-7]+$/);
    }
  });

  it('draws the same map every time', () => {
    expect(drawMap(110, 82)).toEqual(drawMap(110, 82));
  });

  it('shows every pin as a pin', () => {
    const map = drawMap(110, 82);

    for (const pin of MAP_PINS) {
      const { column, row } = pinCell(pin, 110, 82);
      expect(map.rows[row][column]).toBe(PIN_MARK);
    }
  });

  it('draws thread along the way between pins', () => {
    const map = drawMap(110, 82);
    const threadCells = map.rows.join('').split(THREAD_MARK).length - 1;

    expect(threadCells).toBeGreaterThan(MAP_THREADS.length);
  });
});
