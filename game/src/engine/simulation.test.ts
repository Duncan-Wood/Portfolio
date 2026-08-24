import { describe, expect, it } from 'vitest';
import { COLUMNS, FIRST_VISIBLE_ROW, ROWS } from './grid';
import { DEFAULT_TUNING } from '../tuning';
import { SPAWN_COLUMN, SPAWN_ROW, Simulation } from './simulation';

/*
 * These drive the pair by letting it FALL, so they ask for gravity explicitly.
 * The shipped game has it off — see `gravityEnabled` in `tuning.ts` — because
 * the game is an escape room made of boards and a piece descending while you
 * read one is a clock. What is being tested here is still real: hard drop,
 * lock delay and the cascade all behave the same either way, and the
 * deliberate-placement rules have their own block in `simulation.test.ts`.
 */
const FALLING = { ...DEFAULT_TUNING, gravityEnabled: true };

const { fallInterval, lockDelay, softDropInterval } = DEFAULT_TUNING;

const RED = 0;
const BLUE = 1;

const simulation = () => new Simulation(() => [RED, BLUE], FALLING);

const dropToFloor = (game: Simulation) => {
  // Bounded. With gravity off a pair never falls on its own, so an unbounded
  // wait here does not fail a test — it hangs the whole run.
  for (let step = 0; step < ROWS * 2 && game.pair.canFall(game.board); step += 1) {
    game.update(fallInterval);
  }
};

/**
 * Fills the spawn column below the spawn row, cycling colours so the fill never
 * forms a group of its own.
 */
const fillUnderSpawn = (game: Simulation) => {
  for (let row = SPAWN_ROW + 1; row < ROWS; row += 1) {
    game.board.place(SPAWN_COLUMN, row, (row % 3) + 1);
  }
};

/** Stacks `height` tiles of one colour under the spawn column. */
const stackUnderSpawn = (game: Simulation, pieceType: number, height: number) => {
  for (let row = ROWS - height; row < ROWS; row += 1) {
    game.board.place(SPAWN_COLUMN, row, pieceType);
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
    const game = new Simulation(() => [4, 5], FALLING);
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
    const tuning = { ...FALLING };
    const game = new Simulation(() => [RED, BLUE], tuning);

    tuning.fallInterval = 100;
    game.update(100);

    expect(game.pair.row).toBe(SPAWN_ROW + 1);
  });

  it('leaves the shared defaults untouched when a caller mutates its own tuning', () => {
    const original = DEFAULT_TUNING.fallInterval;
    const tuning = { ...FALLING };
    tuning.fallInterval = original + 1;

    expect(DEFAULT_TUNING.fallInterval).toBe(original);
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

  it('reports what each link earned on the beat, weighted by its depth', () => {
    const game = buildTwoLinkChain();
    lockCurrentPair(game);

    game.update(DEFAULT_TUNING.chainLinkDelay);
    const first = game.lastBeat;

    game.update(DEFAULT_TUNING.settleDelay);
    game.update(DEFAULT_TUNING.chainLinkDelay);
    const second = game.lastBeat;

    // The scene cannot derive this: by the time it reads the beat the running
    // total has already moved on, and the multiplier is gone.
    expect(first?.kind === 'clear' && first.connections).toBe(5);
    expect(second?.kind === 'clear' && second.connections).toBe(10);
  });

  it('counts no connections before anything clears', () => {
    const game = buildTwoLinkChain();
    expect(game.connectionsMade).toBe(0);
  });

  it('pays a deeper link more, so a chain beats the same cells cleared singly', () => {
    const game = buildTwoLinkChain();
    lockCurrentPair(game);

    game.update(DEFAULT_TUNING.chainLinkDelay);
    const afterFirstLink = game.connectionsMade;

    game.update(DEFAULT_TUNING.settleDelay);
    game.update(DEFAULT_TUNING.chainLinkDelay);

    // Five cells at x1, then five more at x2. Cleared as two separate pieces
    // the same ten cells would have paid ten.
    expect(afterFirstLink).toBe(5);
    expect(game.connectionsMade).toBe(15);
  });

  it('grows linearly with depth, unlike the score, which doubles', () => {
    const game = buildTwoLinkChain();
    lockCurrentPair(game);

    game.update(DEFAULT_TUNING.chainLinkDelay);
    game.update(DEFAULT_TUNING.settleDelay);
    game.update(DEFAULT_TUNING.chainLinkDelay);

    // Same two links: the meter went 5 -> 15, the score went 50 -> 150.
    expect(game.connectionsMade).toBe(15);
    expect(game.score).toBe(50 + 100);
  });

  it('forgets the count on restart', () => {
    const game = buildTwoLinkChain();
    lockCurrentPair(game);
    game.update(DEFAULT_TUNING.chainLinkDelay);
    expect(game.connectionsMade).toBeGreaterThan(0);

    game.restart();

    expect(game.connectionsMade).toBe(0);
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
    const game = new Simulation(sequence([RED, BLUE], [GREEN, YELLOW]), FALLING);

    expect(game.pair.pivotType).toBe(RED);
    expect(game.pair.satelliteType).toBe(BLUE);
    expect(game.upcoming).toEqual([GREEN, YELLOW]);
  });

  it('spawns exactly the pair it previewed', () => {
    const game = new Simulation(sequence([RED, BLUE], [GREEN, YELLOW], [BLUE, RED]), FALLING);
    dropToFloor(game);
    game.update(lockDelay);

    expect(game.pair.pivotType).toBe(GREEN);
    expect(game.pair.satelliteType).toBe(YELLOW);
  });

  it('shows a new upcoming pair once the previewed one has spawned', () => {
    const game = new Simulation(sequence([RED, BLUE], [GREEN, YELLOW], [BLUE, RED]), FALLING);
    dropToFloor(game);
    game.update(lockDelay);

    expect(game.upcoming).toEqual([BLUE, RED]);
  });

  it('draws once per piece, staying exactly one piece ahead', () => {
    let draws = 0;
    const game = new Simulation((): [number, number] => {
      draws += 1;
      return [RED, BLUE];
    }, FALLING);

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

describe('topping out', () => {
  const snapshot = (game: Simulation) => {
    const cells: (number | null)[] = [];
    for (let row = 0; row < ROWS; row += 1) {
      for (let column = 0; column < COLUMNS; column += 1) {
        cells.push(game.board.pieceAt(column, row));
      }
    }
    return cells;
  };

  const lockIntoAFullColumn = () => {
    const game = simulation();
    fillUnderSpawn(game);
    game.update(lockDelay);
    return game;
  };

  it('starts out not topped out', () => {
    expect(simulation().toppedOut).toBe(false);
  });

  it('tops out when the next pair has nowhere to spawn', () => {
    expect(lockIntoAFullColumn().toppedOut).toBe(true);
  });

  it('stops spawning once topped out', () => {
    const game = lockIntoAFullColumn();
    const spawned = game.piecesSpawned;

    for (let tick = 0; tick < 20; tick += 1) {
      game.update(fallInterval);
    }

    expect(game.piecesSpawned).toBe(spawned);
  });

  it('ignores input once topped out', () => {
    const game = lockIntoAFullColumn();

    expect(game.moveLeft()).toBe(false);
    expect(game.moveRight()).toBe(false);
    expect(game.rotate()).toBe(false);
  });

  /**
   * The board must be frozen exactly as the player left it. Were a pair still
   * to spawn, `Board.place` would either throw on the occupied spawn cell or
   * overwrite it — this catches both, where asserting the spawn cell's colour
   * alone caught neither, since `lock` had just written that colour itself.
   */
  it('leaves the final board untouched', () => {
    const game = lockIntoAFullColumn();
    const finalBoard = snapshot(game);

    for (let tick = 0; tick < 20; tick += 1) {
      game.update(fallInterval);
    }

    expect(snapshot(game)).toEqual(finalBoard);
  });

  /**
   * The other route into the rule: a chain finishes and the pair after it has
   * nowhere to go. It reaches `spawnOrTopOut` with `resolving` already cleared
   * and the board freshly settled, so it is worth its own test — the lock-path
   * tests above pass with this call site broken.
   */
  it('tops out at the end of a cascade', () => {
    const game = simulation();

    // Out of the spawn column, so the fill below can seal it completely.
    game.moveLeft();
    game.moveLeft();
    for (let row = SPAWN_ROW; row < ROWS; row += 1) {
      game.board.place(SPAWN_COLUMN, row, (row % 3) + 2);
    }

    // Three reds for the pair's red pivot to complete a group of four.
    for (let row = ROWS - 3; row < ROWS; row += 1) {
      game.board.place(0, row, RED);
    }

    dropToFloor(game);
    game.update(lockDelay);
    expect(game.resolving).toBe(true);

    const beat = Math.max(DEFAULT_TUNING.chainLinkDelay, DEFAULT_TUNING.settleDelay);
    for (let tick = 0; tick < 20 && game.resolving; tick += 1) {
      game.update(beat);
    }

    expect(game.score).toBeGreaterThan(0);
    expect(game.toppedOut).toBe(true);
  });
});

describe('restarting', () => {
  const toppedOutGame = () => {
    const game = simulation();
    fillUnderSpawn(game);
    game.update(lockDelay);
    return game;
  };

  it('clears the topped-out state', () => {
    const game = toppedOutGame();
    game.restart();
    expect(game.toppedOut).toBe(false);
  });

  it('empties the board', () => {
    const game = toppedOutGame();
    game.restart();

    for (let row = 0; row < ROWS; row += 1) {
      for (let column = 0; column < COLUMNS; column += 1) {
        expect(game.board.isEmpty(column, row)).toBe(true);
      }
    }
  });

  it('resets the score', () => {
    const game = toppedOutGame();
    game.score = 480;
    game.restart();
    expect(game.score).toBe(0);
  });

  it('puts a fresh pair back at the spawn point', () => {
    const game = toppedOutGame();
    game.restart();

    expect(game.pair.column).toBe(SPAWN_COLUMN);
    expect(game.pair.row).toBe(SPAWN_ROW);
    expect(game.pair.orientation).toBe(0);
  });

  it('accepts input and gravity again', () => {
    const game = toppedOutGame();
    game.restart();

    expect(game.moveLeft()).toBe(true);
    game.update(fallInterval);
    expect(game.pair.row).toBe(SPAWN_ROW + 1);
  });

  it('abandons a cascade in progress', () => {
    const game = simulation();
    stackUnderSpawn(game, RED, 3);
    dropToFloor(game);
    game.update(lockDelay);
    expect(game.resolving).toBe(true);

    game.restart();

    expect(game.resolving).toBe(false);
    expect(game.chainLength).toBe(0);
  });
});

describe('reporting each cascade beat to the scene', () => {
  /** A red trio under the spawn column, so the pair's red pivot completes four. */
  const chainingGame = () => {
    const game = simulation();
    stackUnderSpawn(game, RED, 3);
    dropToFloor(game);
    game.update(lockDelay);
    return game;
  };

  it('reports no beats before anything resolves', () => {
    const game = simulation();
    expect(game.beatsPlayed).toBe(0);
    expect(game.lastBeat).toBe(null);
  });

  it('counts a beat each time the cascade advances', () => {
    const game = chainingGame();
    const before = game.beatsPlayed;

    game.update(DEFAULT_TUNING.chainLinkDelay);

    expect(game.beatsPlayed).toBe(before + 1);
  });

  /**
   * The cascade ending is not a beat. Counting it would have the scene reach
   * for a `lastBeat` describing the previous one and replay it.
   */
  it('does not count the step that finds nothing left to clear', () => {
    const game = chainingGame();
    game.update(DEFAULT_TUNING.chainLinkDelay);
    game.update(DEFAULT_TUNING.settleDelay);
    const afterSettle = game.beatsPlayed;

    game.update(DEFAULT_TUNING.chainLinkDelay);

    expect(game.resolving).toBe(false);
    expect(game.beatsPlayed).toBe(afterSettle);
  });

  it('hands the scene the cells that just popped', () => {
    const game = chainingGame();
    game.update(DEFAULT_TUNING.chainLinkDelay);

    const beat = game.lastBeat!;
    expect(beat.kind).toBe('clear');
    if (beat.kind !== 'clear') {
      return;
    }

    const popped = beat.link.groups.flatMap((group) => group.cells);
    expect(popped).toHaveLength(4);
    expect(popped.every((cell) => cell.column === SPAWN_COLUMN)).toBe(true);
  });

  /**
   * The score survives because it is still drawn in the corner, but it no
   * longer rides on the beat: nothing reads what one link alone scored, and
   * `connections` — asserted above — is what progression is measured in.
   */
  it('adds each link\'s score to the running total', () => {
    const game = chainingGame();
    game.update(DEFAULT_TUNING.chainLinkDelay);

    expect(game.score).toBe(40);
  });

  it('hands the scene the tiles that just fell', () => {
    const game = chainingGame();
    // The red pivot completes the trio and pops with it, leaving the blue
    // satellite stranded one row above the hole it now has to fall through.
    const strandedRow = game.pair.row - 1;

    game.update(DEFAULT_TUNING.chainLinkDelay);
    game.update(DEFAULT_TUNING.settleDelay);

    const beat = game.lastBeat!;
    expect(beat.kind).toBe('settle');
    if (beat.kind !== 'settle') {
      return;
    }
    expect(beat.moves).toEqual([{ column: SPAWN_COLUMN, fromRow: strandedRow, toRow: ROWS - 1 }]);
  });

  it('forgets the previous beat when a new game starts', () => {
    const game = chainingGame();
    game.update(DEFAULT_TUNING.chainLinkDelay);

    game.restart();

    expect(game.lastBeat).toBe(null);
    expect(game.beatsPlayed).toBe(0);
  });
});

describe('how far the pair has fallen toward the next row', () => {
  it('starts a piece at zero', () => {
    expect(simulation().fallProgress).toBe(0);
  });

  it('grows as a fraction of the interval', () => {
    const game = simulation();
    game.update(fallInterval / 4);
    expect(game.fallProgress).toBeCloseTo(0.25);
  });

  it('wraps back toward zero once a row is crossed', () => {
    const game = simulation();
    game.update(fallInterval * 1.25);
    expect(game.pair.row).toBe(SPAWN_ROW + 1);
    expect(game.fallProgress).toBeCloseTo(0.25);
  });
});

describe('hard drop', () => {
  it('slams the pair to the floor', () => {
    const game = simulation();
    game.hardDrop();

    expect(game.board.pieceAt(SPAWN_COLUMN, ROWS - 1)).toBe(RED);
    expect(game.board.pieceAt(SPAWN_COLUMN, ROWS - 2)).toBe(BLUE);
  });

  it('lands on top of the stack rather than through it', () => {
    const game = simulation();
    game.board.place(SPAWN_COLUMN, ROWS - 1, 3);
    game.hardDrop();

    expect(game.board.pieceAt(SPAWN_COLUMN, ROWS - 1)).toBe(3);
    expect(game.board.pieceAt(SPAWN_COLUMN, ROWS - 2)).toBe(RED);
  });

  it('returns how far the pair travelled', () => {
    const game = simulation();
    expect(game.hardDrop()).toBe(ROWS - 1 - SPAWN_ROW);
  });

  it('returns zero when the pair is already resting', () => {
    const game = simulation();
    fillUnderSpawn(game);

    expect(game.hardDrop()).toBe(0);
  });

  /**
   * The point of the whole feature: no waiting. A pair that lands on the lock
   * timer takes `lockDelay` to commit, and this must not.
   */
  it('commits without waiting out the lock delay', () => {
    const game = simulation();
    const spawned = game.piecesSpawned;

    game.hardDrop();

    expect(game.piecesSpawned).toBe(spawned + 1);
    expect(game.pair.row).toBe(SPAWN_ROW);
  });

  it('starts a cascade when the slam completes a group', () => {
    const game = simulation();
    stackUnderSpawn(game, RED, 3);

    game.hardDrop();

    expect(game.resolving).toBe(true);
  });

  it('tops out when the slam fills the spawn column', () => {
    const game = simulation();
    fillUnderSpawn(game);

    game.hardDrop();

    expect(game.toppedOut).toBe(true);
  });

  it('is refused while a cascade resolves', () => {
    const game = simulation();
    stackUnderSpawn(game, RED, 3);
    game.hardDrop();
    expect(game.resolving).toBe(true);

    const spawned = game.piecesSpawned;
    expect(game.hardDrop()).toBe(0);
    expect(game.piecesSpawned).toBe(spawned);
  });

  it('is refused after a top-out', () => {
    const game = simulation();
    fillUnderSpawn(game);
    game.hardDrop();
    expect(game.toppedOut).toBe(true);

    expect(game.hardDrop()).toBe(0);
  });

  it('does not carry fall progress into the next piece', () => {
    const game = simulation();
    game.update(fallInterval * 0.9);
    game.hardDrop();

    expect(game.fallProgress).toBe(0);
  });
});

describe('reporting where a pair came to rest', () => {
  it('counts nothing locked before the first pair lands', () => {
    const game = simulation();
    expect(game.piecesLocked).toBe(0);
    expect(game.lastLanded).toEqual([]);
  });

  it('reports both halves once a pair locks', () => {
    const game = simulation();
    game.hardDrop();

    expect(game.piecesLocked).toBe(1);
    expect(game.lastLanded).toEqual([
      { column: SPAWN_COLUMN, row: ROWS - 1, pieceType: RED },
      { column: SPAWN_COLUMN, row: ROWS - 2, pieceType: BLUE },
    ]);
  });

  /**
   * The reason this is reported rather than derived. A half that settles into a
   * hole ends up somewhere neither the pair's last position nor a scan of the
   * column's topmost tile would find.
   */
  it('reports where a half ended up after settling, not where it was placed', () => {
    const game = new Simulation(() => [RED, BLUE], FALLING);
    // A ledge one column over, so the horizontal pair straddles a gap and its
    // right half keeps falling after the left half stops.
    game.board.place(SPAWN_COLUMN, ROWS - 1, 3);
    game.rotate();
    game.hardDrop();

    const [pivot, satellite] = game.lastLanded;
    expect(pivot).toEqual({ column: SPAWN_COLUMN, row: ROWS - 2, pieceType: RED });
    expect(satellite).toEqual({ column: SPAWN_COLUMN + 1, row: ROWS - 1, pieceType: BLUE });
  });

  /**
   * The landings the whole game is about. Inferring a lock from `piecesSpawned`
   * missed these, because a lock that starts a cascade spawns nothing.
   */
  it('counts a lock that starts a cascade, which spawns no pair', () => {
    const game = simulation();
    stackUnderSpawn(game, RED, 3);
    const spawned = game.piecesSpawned;

    game.hardDrop();

    expect(game.resolving).toBe(true);
    expect(game.piecesSpawned).toBe(spawned);
    expect(game.piecesLocked).toBe(1);
  });

  it('counts a lock that tops the board out', () => {
    const game = simulation();
    fillUnderSpawn(game);

    game.update(lockDelay);

    expect(game.toppedOut).toBe(true);
    expect(game.piecesLocked).toBe(1);
  });

  it('forgets the last landing when a new game starts', () => {
    const game = simulation();
    game.hardDrop();
    game.restart();

    expect(game.piecesLocked).toBe(0);
    expect(game.lastLanded).toEqual([]);
  });
});

describe('with gravity cut, a piece waits for the player', () => {
  const deliberate = () => new Simulation(
    () => [0, 1],
    { ...DEFAULT_TUNING, gravityEnabled: false },
  );

  it('does not fall on its own, however long you think', () => {
    const game = deliberate();
    const startedAt = game.pair.row;

    game.update(DEFAULT_TUNING.fallInterval * 20);

    // An escape room is a thinking game. A piece that descends while you read
    // the board is a clock, and a clock is the thing that made this unable to
    // hold a puzzle.
    expect(game.pair.row).toBe(startedAt);
  });

  it('still descends while soft drop is held, so placing stays quick', () => {
    const game = deliberate();
    const startedAt = game.pair.row;

    game.softDropping = true;
    game.update(DEFAULT_TUNING.softDropInterval * 3);

    expect(game.pair.row).toBeGreaterThan(startedAt);
  });

  it('never locks itself, even resting on the floor', () => {
    const game = deliberate();
    game.softDropping = true;
    game.update(DEFAULT_TUNING.softDropInterval * 40);
    game.softDropping = false;
    expect(game.pair.canFall(game.board)).toBe(false);

    game.update(DEFAULT_TUNING.lockDelay * 6);

    // Nothing commits a piece but the player. Sliding it along the floor for
    // as long as you like is the whole point of cutting the clock.
    expect(game.piecesLocked).toBe(0);
  });

  it('commits on a hard drop, which is the only thing that does', () => {
    const game = deliberate();

    game.hardDrop();

    expect(game.piecesLocked).toBe(1);
  });

  it('still lets the shadow take ground while you think', () => {
    const game = deliberate();
    for (let column = 0; column < COLUMNS; column += 1) {
      game.board.place(column, ROWS - 1, column % 4);
    }

    game.update(DEFAULT_TUNING.shadowInterval);

    // Cutting gravity must not cut the pressure. Hesitation is still the thing
    // that costs you, and it is now the ONLY thing that does.
    expect(game.shadowOnBoard).toBe(1);
  });
});
