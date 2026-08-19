import { describe, expect, it } from 'vitest';
import { FIRST_VISIBLE_ROW, ROWS } from './grid';
import { DEFAULT_TUNING } from '../tuning';
import { SPAWN_COLUMN, SPAWN_ROW, Simulation } from './simulation';

const { fallInterval, lockDelay, softDropInterval } = DEFAULT_TUNING;

const RED = 0;
const BLUE = 1;

const simulation = () => new Simulation(() => [RED, BLUE]);

const dropToFloor = (game: Simulation) => {
  while (game.pair.canFall(game.board)) {
    game.update(fallInterval);
  }
};

describe('spawning', () => {
  it('starts with a pair at the top of the spawn column', () => {
    const game = simulation();
    expect(game.pair.column).toBe(SPAWN_COLUMN);
    expect(game.pair.row).toBe(SPAWN_ROW);
    expect(game.pair.orientation).toBe(0);
  });

  it('takes both piece types from the supplier', () => {
    const game = new Simulation(() => [4, 5]);
    expect(game.pair.pivotType).toBe(4);
    expect(game.pair.satelliteType).toBe(5);
  });
});

describe('gravity', () => {
  it('does not fall before the interval elapses', () => {
    const game = simulation();
    game.update(fallInterval - 1);
    expect(game.pair.row).toBe(SPAWN_ROW);
  });

  it('falls one row once the interval elapses', () => {
    const game = simulation();
    game.update(fallInterval);
    expect(game.pair.row).toBe(SPAWN_ROW + 1);
  });

  it('accumulates time across several updates', () => {
    const game = simulation();
    game.update(fallInterval / 2);
    game.update(fallInterval / 2);
    expect(game.pair.row).toBe(SPAWN_ROW + 1);
  });

  it('falls several rows when a large delta arrives at once', () => {
    const game = simulation();
    game.update(fallInterval * 3);
    expect(game.pair.row).toBe(SPAWN_ROW + 3);
  });

  it('falls faster while soft dropping', () => {
    const game = simulation();
    game.softDropping = true;
    game.update(softDropInterval);
    expect(game.pair.row).toBe(SPAWN_ROW + 1);
  });
});

describe('lock delay', () => {
  it('does not lock the instant the pair lands', () => {
    const game = simulation();
    dropToFloor(game);
    expect(game.board.isEmpty(SPAWN_COLUMN, ROWS - 1)).toBe(true);
  });

  it('locks once the lock delay elapses', () => {
    const game = simulation();
    dropToFloor(game);
    game.update(lockDelay);
    expect(game.board.pieceAt(SPAWN_COLUMN, ROWS - 1)).toBe(RED);
    expect(game.board.pieceAt(SPAWN_COLUMN, ROWS - 2)).toBe(BLUE);
  });

  it('restarts the lock delay after a successful move', () => {
    const game = simulation();
    dropToFloor(game);
    game.update(lockDelay - 1);
    game.moveLeft();
    game.update(lockDelay - 1);
    expect(game.board.isEmpty(SPAWN_COLUMN - 1, ROWS - 1)).toBe(true);
  });

  it('does not restart the lock delay after a blocked move', () => {
    const game = simulation();
    game.moveLeft();
    game.moveLeft();
    dropToFloor(game);
    game.update(lockDelay - 1);
    game.moveLeft();
    game.update(1);
    expect(game.board.isEmpty(0, ROWS - 1)).toBe(false);
  });

  it('spawns a fresh pair after locking', () => {
    const game = simulation();
    dropToFloor(game);
    game.update(lockDelay);
    expect(game.pair.row).toBe(SPAWN_ROW);
    expect(game.pair.column).toBe(SPAWN_COLUMN);
  });

  it('stacks the next pair on top of the locked one', () => {
    const game = simulation();
    dropToFloor(game);
    game.update(lockDelay);
    dropToFloor(game);
    game.update(lockDelay);
    expect(game.board.pieceAt(SPAWN_COLUMN, ROWS - 3)).toBe(RED);
    expect(game.board.pieceAt(SPAWN_COLUMN, ROWS - 4)).toBe(BLUE);
  });

  it('cancels the lock delay when a move opens space below the pair', () => {
    const game = simulation();
    dropToFloor(game);
    game.update(lockDelay);

    dropToFloor(game);
    const restingRow = game.pair.row;
    game.update(lockDelay - 1);
    game.moveLeft();
    game.update(fallInterval);

    expect(game.pair.row).toBeGreaterThan(restingRow);
  });
});

describe('live tuning', () => {
  it('re-reads the tuning object each update, so a later mutation takes effect', () => {
    const tuning = { ...DEFAULT_TUNING };
    const game = new Simulation(() => [RED, BLUE], tuning);

    tuning.fallInterval = 100;
    game.update(100);

    expect(game.pair.row).toBe(SPAWN_ROW + 1);
  });

  it('leaves the shared defaults untouched when a caller mutates its own tuning', () => {
    const tuning = { ...DEFAULT_TUNING };
    tuning.fallInterval = 1;

    expect(DEFAULT_TUNING.fallInterval).toBe(800);
  });
});

describe('the spawn counter', () => {
  it('counts the pair the simulation starts with', () => {
    expect(simulation().piecesSpawned).toBe(1);
  });

  it('does not change while the same pair is falling', () => {
    const game = simulation();
    game.update(fallInterval);
    expect(game.piecesSpawned).toBe(1);
  });

  it('increments when a pair locks and the next one spawns', () => {
    const game = simulation();
    dropToFloor(game);
    game.update(lockDelay);
    expect(game.piecesSpawned).toBe(2);
  });
});

describe('matching after a lock', () => {
  const lockOntoStackOf = (pieceType: number, height: number) => {
    const game = simulation();
    for (let offset = 0; offset < height; offset += 1) {
      game.board.place(SPAWN_COLUMN, ROWS - 1 - offset, pieceType);
    }
    dropToFloor(game);
    game.update(lockDelay);

    for (let tick = 0; game.resolving && tick < 20; tick += 1) {
      game.update(DEFAULT_TUNING.chainLinkDelay);
    }

    return game;
  };

  it('clears a group completed by the locking pair', () => {
    const game = lockOntoStackOf(RED, 3);
    expect(game.board.pieceAt(SPAWN_COLUMN, ROWS - 1)).not.toBe(RED);
  });

  it('leaves the unmatched half of the pair behind', () => {
    const game = lockOntoStackOf(RED, 3);
    expect(game.board.pieceAt(SPAWN_COLUMN, ROWS - 1)).toBe(BLUE);
  });

  it('scores the clear', () => {
    const game = lockOntoStackOf(RED, 3);
    expect(game.score).toBeGreaterThan(0);
  });

  it('scores nothing when the lock completes no group', () => {
    const game = simulation();
    dropToFloor(game);
    game.update(lockDelay);

    expect(game.score).toBe(0);
  });
});

describe('switching between gravity and soft drop', () => {
  it('does not spend banked gravity time at the soft-drop rate', () => {
    const game = simulation();
    game.update(fallInterval - 1);

    game.softDropping = true;
    game.update(1);

    expect(game.pair.row).toBe(SPAWN_ROW + 1);
  });

  it('carries partial progress across the rate change', () => {
    const game = simulation();
    game.update(fallInterval / 2);

    game.softDropping = true;
    game.update(softDropInterval / 2);

    expect(game.pair.row).toBe(SPAWN_ROW + 1);
  });

  it('re-prices the remaining fraction of a row when soft drop is released', () => {
    const game = simulation();
    game.softDropping = true;
    game.update(softDropInterval * 0.9);

    game.softDropping = false;
    game.update(softDropInterval * 0.1);
    expect(game.pair.row).toBe(SPAWN_ROW);

    game.update(fallInterval * 0.1);
    expect(game.pair.row).toBe(SPAWN_ROW + 1);
  });

  it('still falls one row per soft-drop interval while held', () => {
    const game = simulation();
    game.softDropping = true;
    game.update(softDropInterval * 3);

    expect(game.pair.row).toBe(SPAWN_ROW + 3);
  });
});

describe('resolving a chain over time', () => {
  const buildTwoLinkChain = () => {
    const game = simulation();
    // B clears first; the stranded R above it falls in to complete the R group.
    game.board.place(0, ROWS - 1, RED);
    game.board.place(0, ROWS - 2, RED);
    game.board.place(0, ROWS - 3, RED);
    game.board.place(1, ROWS - 1, BLUE);
    game.board.place(1, ROWS - 2, BLUE);
    game.board.place(1, ROWS - 3, BLUE);
    game.board.place(2, ROWS - 1, BLUE);
    game.board.place(1, ROWS - 4, RED);
    return game;
  };

  const lockCurrentPair = (game: Simulation) => {
    dropToFloor(game);
    game.update(lockDelay);
  };

  it('spawns the next pair immediately when the lock matches nothing', () => {
    const game = simulation();
    const before = game.piecesSpawned;

    lockCurrentPair(game);

    expect(game.piecesSpawned).toBe(before + 1);
    expect(game.resolving).toBe(false);
  });

  it('enters the resolving phase when the lock completes a group', () => {
    const game = simulation();
    for (let offset = 0; offset < 3; offset += 1) {
      game.board.place(SPAWN_COLUMN, ROWS - 1 - offset, RED);
    }

    lockCurrentPair(game);

    expect(game.resolving).toBe(true);
  });

  it('holds the next pair back until the chain finishes', () => {
    const game = simulation();
    for (let offset = 0; offset < 3; offset += 1) {
      game.board.place(SPAWN_COLUMN, ROWS - 1 - offset, RED);
    }
    const before = game.piecesSpawned;

    lockCurrentPair(game);

    expect(game.piecesSpawned).toBe(before);
  });

  it('clears one link per chain-link delay rather than all at once', () => {
    const game = buildTwoLinkChain();
    lockCurrentPair(game);

    game.update(DEFAULT_TUNING.chainLinkDelay);
    const afterFirstLink = game.score;

    game.update(DEFAULT_TUNING.settleDelay);
    game.update(DEFAULT_TUNING.chainLinkDelay);
    const afterSecondLink = game.score;

    expect(afterFirstLink).toBeGreaterThan(0);
    expect(afterSecondLink).toBeGreaterThan(afterFirstLink);
  });

  it('holds cleared tiles in the air for a beat before settling them', () => {
    const game = buildTwoLinkChain();
    lockCurrentPair(game);

    game.update(DEFAULT_TUNING.chainLinkDelay);
    expect(game.board.pieceAt(1, ROWS - 4)).toBe(RED);

    game.update(DEFAULT_TUNING.settleDelay);
    expect(game.board.isEmpty(1, ROWS - 4)).toBe(true);
  });

  it('ignores input while resolving', () => {
    const game = simulation();
    for (let offset = 0; offset < 3; offset += 1) {
      game.board.place(SPAWN_COLUMN, ROWS - 1 - offset, RED);
    }
    lockCurrentPair(game);

    expect(game.moveLeft()).toBe(false);
    expect(game.rotate()).toBe(false);
  });

  it('returns to falling and spawns once nothing is left to clear', () => {
    const game = simulation();
    for (let offset = 0; offset < 3; offset += 1) {
      game.board.place(SPAWN_COLUMN, ROWS - 1 - offset, RED);
    }
    const before = game.piecesSpawned;
    lockCurrentPair(game);

    for (let tick = 0; tick < 10; tick += 1) {
      game.update(DEFAULT_TUNING.chainLinkDelay);
    }

    expect(game.resolving).toBe(false);
    expect(game.piecesSpawned).toBe(before + 1);
  });
});

describe('the next-piece preview', () => {
  const GREEN = 2;
  const YELLOW = 3;

  const sequence = (...pairs: [number, number][]) => {
    let index = 0;
    return (): [number, number] => pairs[Math.min(index++, pairs.length - 1)];
  };

  it('exposes the upcoming pair while the current one is still falling', () => {
    const game = new Simulation(sequence([RED, BLUE], [GREEN, YELLOW]));

    expect(game.pair.pivotType).toBe(RED);
    expect(game.pair.satelliteType).toBe(BLUE);
    expect(game.upcoming).toEqual([GREEN, YELLOW]);
  });

  it('spawns exactly the pair it previewed', () => {
    const game = new Simulation(sequence([RED, BLUE], [GREEN, YELLOW], [BLUE, RED]));
    dropToFloor(game);
    game.update(lockDelay);

    expect(game.pair.pivotType).toBe(GREEN);
    expect(game.pair.satelliteType).toBe(YELLOW);
  });

  it('shows a new upcoming pair once the previewed one has spawned', () => {
    const game = new Simulation(sequence([RED, BLUE], [GREEN, YELLOW], [BLUE, RED]));
    dropToFloor(game);
    game.update(lockDelay);

    expect(game.upcoming).toEqual([BLUE, RED]);
  });

  it('draws once per piece, staying exactly one piece ahead', () => {
    let draws = 0;
    const game = new Simulation((): [number, number] => {
      draws += 1;
      return [RED, BLUE];
    });

    expect(draws).toBe(game.piecesSpawned + 1);

    dropToFloor(game);
    game.update(lockDelay);

    expect(draws).toBe(game.piecesSpawned + 1);
  });
});

describe('spawning into the hidden row', () => {
  it('puts the pivot on the first visible row', () => {
    expect(simulation().pair.row).toBe(FIRST_VISIBLE_ROW);
  });

  it('puts the satellite in the hidden row above it', () => {
    const [, satellite] = simulation().pair.cells();
    expect(satellite.row).toBe(FIRST_VISIBLE_ROW - 1);
  });

  it('keeps both halves inside the board, unlike spawning at row 0', () => {
    const game = simulation();
    for (const cell of game.pair.cells()) {
      expect(game.board.isInside(cell.column, cell.row)).toBe(true);
    }
  });

  it('locks both halves onto the board instead of discarding one', () => {
    const game = simulation();
    for (let row = FIRST_VISIBLE_ROW; row < ROWS; row += 1) {
      if (row > FIRST_VISIBLE_ROW) {
        game.board.place(SPAWN_COLUMN, row, 2);
      }
    }

    game.update(lockDelay);

    expect(game.board.pieceAt(SPAWN_COLUMN, FIRST_VISIBLE_ROW)).toBe(RED);
    expect(game.board.pieceAt(SPAWN_COLUMN, FIRST_VISIBLE_ROW - 1)).toBe(BLUE);
  });
});
