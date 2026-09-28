import { describe, expect, it } from 'vitest';
import {
  BUILD_DURATION,
  CUSTOMER_COUNT,
  MAP_COLUMNS,
  MAP_PINS,
  MAP_ROWS,
  MAP_THREADS,
  PIN_MARK,
  THREAD_MARK,
  drawLand,
  drawMap,
  isLand,
  PIN_DROP_DURATION,
  PIN_DROP_HEIGHT,
  pinCell,
  pinDrop,
  pinLandsAt,
  pinLanded,
  threadCells,
  threadRun,
  threadStartsAt,
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
      const { column, row } = pinCell(pin, MAP_COLUMNS, MAP_ROWS);
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
    for (const [columns, rows] of [[MAP_COLUMNS, MAP_ROWS], [22, 16]]) {
      const map = drawMap(columns, rows);

      expect(map.columns).toBe(columns);
      expect(map.rows).toHaveLength(rows);
      for (const row of map.rows) {
        expect(row).toHaveLength(columns);
      }
    }
  });

  it('uses only marks the art baker knows how to colour', () => {
    for (const row of drawMap(MAP_COLUMNS, MAP_ROWS).rows) {
      expect(row).toMatch(/^[.0-7]+$/);
    }
  });

  it('draws the same map every time', () => {
    expect(drawMap(MAP_COLUMNS, MAP_ROWS)).toEqual(drawMap(MAP_COLUMNS, MAP_ROWS));
  });

  it('shows every pin as a pin', () => {
    const map = drawMap(MAP_COLUMNS, MAP_ROWS);

    for (const pin of MAP_PINS) {
      const { column, row } = pinCell(pin, MAP_COLUMNS, MAP_ROWS);
      expect(map.rows[row][column]).toBe(PIN_MARK);
    }
  });

  it('draws thread along the way between pins', () => {
    const map = drawMap(MAP_COLUMNS, MAP_ROWS);
    const threadCells = map.rows.join('').split(THREAD_MARK).length - 1;

    expect(threadCells).toBeGreaterThan(MAP_THREADS.length);
  });
});

describe('the land under the pins', () => {
  it('is the full map with no pins or thread on it yet', () => {
    const land = drawLand(MAP_COLUMNS, MAP_ROWS);
    const map = drawMap(MAP_COLUMNS, MAP_ROWS);

    for (let row = 0; row < MAP_ROWS; row += 1) {
      for (let column = 0; column < MAP_COLUMNS; column += 1) {
        const mark = map.rows[row][column];
        if (mark !== PIN_MARK && mark !== THREAD_MARK) {
          expect(land.rows[row][column]).toBe(mark);
        }
        expect(land.rows[row][column]).not.toBe(PIN_MARK);
        expect(land.rows[row][column]).not.toBe(THREAD_MARK);
      }
    }
  });
});

describe('the cells a thread covers', () => {
  it('runs from the pin it starts at to the pin it ends at', () => {
    for (const thread of MAP_THREADS) {
      const cells = threadCells(thread, MAP_COLUMNS, MAP_ROWS);

      expect(cells[0]).toEqual(pinCell(MAP_PINS[thread[0]], MAP_COLUMNS, MAP_ROWS));
      expect(cells[cells.length - 1]).toEqual(pinCell(MAP_PINS[thread[1]], MAP_COLUMNS, MAP_ROWS));
    }
  });

  it('never skips a cell, so the thread is unbroken', () => {
    for (const thread of MAP_THREADS) {
      const cells = threadCells(thread, MAP_COLUMNS, MAP_ROWS);
      for (let index = 1; index < cells.length; index += 1) {
        expect(Math.abs(cells[index].column - cells[index - 1].column)).toBeLessThanOrEqual(1);
        expect(Math.abs(cells[index].row - cells[index - 1].row)).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('building the map up', () => {
  it('starts with only the first pin in the air, and nothing down yet', () => {
    expect(pinDrop(0, 0)).toBe(PIN_DROP_HEIGHT);
    for (let index = 0; index < MAP_PINS.length; index += 1) {
      expect(pinLanded(index, 0)).toBe(false);
    }
    for (let index = 1; index < MAP_PINS.length; index += 1) {
      expect(pinDrop(index, 0)).toBeNull();
    }
    MAP_THREADS.forEach((_, index) => expect(threadRun(index, 0)).toBe(0));
  });

  it('only runs a thread out from a pin that is already down', () => {
    MAP_THREADS.forEach(([from], index) => {
      const starts = threadStartsAt(index);

      expect(threadRun(index, starts)).toBe(0);
      expect(threadRun(index, starts + 1)).toBeGreaterThan(0);
      expect(pinLanded(from, starts)).toBe(true);
    });
  });

  it('lands each pin the moment its thread reaches it, not before', () => {
    MAP_THREADS.forEach(([, to], index) => {
      const lands = pinLandsAt(to);

      expect(pinLanded(to, lands - 1)).toBe(false);
      expect(threadRun(index, lands - 1)).toBeLessThan(1);
      expect(pinLanded(to, lands)).toBe(true);
      expect(threadRun(index, lands)).toBe(1);
    });
  });

  it('never runs a thread backwards or past its end', () => {
    MAP_THREADS.forEach((_, index) => {
      let before = 0;
      for (let moment = 0; moment <= BUILD_DURATION; moment += 17) {
        const run = threadRun(index, moment);
        expect(run).toBeGreaterThanOrEqual(before);
        expect(run).toBeLessThanOrEqual(1);
        before = run;
      }
    });
  });

  it('has the whole map up by the time it is done', () => {
    MAP_PINS.forEach((_, index) => expect(pinLanded(index, BUILD_DURATION)).toBe(true));
    MAP_THREADS.forEach((_, index) => expect(threadRun(index, BUILD_DURATION)).toBe(1));
  });

  it('takes long enough to watch but finishes while the card is still being read', () => {
    expect(BUILD_DURATION).toBeGreaterThan(1500);
    expect(BUILD_DURATION).toBeLessThan(4000);
  });
});

describe('a pin dropping into place', () => {
  it('is nowhere to be seen until it starts to fall', () => {
    MAP_PINS.forEach((_, index) => {
      expect(pinDrop(index, pinLandsAt(index) - PIN_DROP_DURATION - 1)).toBeNull();
    });
  });

  it('falls from above its spot and lands exactly on it', () => {
    MAP_PINS.forEach((_, index) => {
      const lands = pinLandsAt(index);

      expect(pinDrop(index, lands - PIN_DROP_DURATION)).toBe(PIN_DROP_HEIGHT);
      expect(pinDrop(index, lands)).toBe(0);
      expect(pinDrop(index, BUILD_DURATION)).toBe(0);
    });
  });

  it('only ever falls downward', () => {
    MAP_PINS.forEach((_, index) => {
      const lands = pinLandsAt(index);
      let above = PIN_DROP_HEIGHT;
      for (let moment = lands - PIN_DROP_DURATION; moment <= lands + 50; moment += 7) {
        const height = pinDrop(index, moment)!;
        expect(height).toBeLessThanOrEqual(above);
        above = height;
      }
    });
  });

  it('picks up speed as it falls, the way gravity would', () => {
    const lands = pinLandsAt(0);
    const halfway = lands - PIN_DROP_DURATION / 2;
    const firstHalf = PIN_DROP_HEIGHT - pinDrop(0, halfway)!;
    const secondHalf = pinDrop(0, halfway)!;

    expect(secondHalf).toBeGreaterThan(firstHalf);
  });
});
