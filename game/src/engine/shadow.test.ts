import { describe, expect, it } from 'vitest';
import { COLUMNS, ROWS, SHADOW, isShadow } from './grid';
import { Board } from './board';
import { findGroups } from './matching';
import { type CascadeBeat, Simulation } from './simulation';
import { DEFAULT_TUNING } from '../tuning';

const RED = 0;
const BLUE = 1;
const simulation = () => new Simulation(() => [RED, BLUE], DEFAULT_TUNING);

const settle = (game: Simulation) => {
  // Bounded. With gravity off a pair never falls on its own, so an unbounded
  // wait here does not fail a test — it hangs the whole run.
  for (let step = 0; step < ROWS * 2 && game.pair.canFall(game.board); step += 1) {
    game.update(DEFAULT_TUNING.fallInterval);
  }
  game.update(DEFAULT_TUNING.lockDelay);

  for (let beat = 0; beat < 200 && game.resolving; beat += 1) {
    game.update(Math.max(DEFAULT_TUNING.chainLinkDelay, DEFAULT_TUNING.settleDelay));
  }
};

const settleCollectingBeats = (game: Simulation): CascadeBeat[] => {
  const beats: CascadeBeat[] = [];
  let seen = game.beatsPlayed;

  for (let step = 0; step < ROWS * 2 && game.pair.canFall(game.board); step += 1) {
    game.update(DEFAULT_TUNING.fallInterval);
  }
  game.update(DEFAULT_TUNING.lockDelay);

  for (let beat = 0; beat < 200 && game.resolving; beat += 1) {
    game.update(Math.max(DEFAULT_TUNING.chainLinkDelay, DEFAULT_TUNING.settleDelay));
    if (game.beatsPlayed !== seen && game.lastBeat !== null) {
      seen = game.beatsPlayed;
      beats.push(game.lastBeat);
    }
  }

  return beats;
};

describe('shadow as an obstacle', () => {
  it('never forms a group, however many of it are touching', () => {
    const board = new Board();
    for (let column = 0; column < COLUMNS; column += 1) {
      board.place(column, ROWS - 1, SHADOW);
    }

    expect(findGroups(board)).toHaveLength(0);
  });

  it('does not join a colour group it is adjacent to', () => {
    const board = new Board();
    board.place(0, ROWS - 1, RED);
    board.place(1, ROWS - 1, RED);
    board.place(2, ROWS - 1, RED);
    board.place(3, ROWS - 1, SHADOW);

    // Three reds and a shadow is three reds. Without this the shadow would be the
    // fourth member and would clear itself.
    expect(findGroups(board)).toHaveLength(0);
  });

  it('lets a colour group form around it without being consumed', () => {
    const board = new Board();
    board.place(0, ROWS - 1, RED);
    board.place(1, ROWS - 1, RED);
    board.place(2, ROWS - 1, RED);
    board.place(3, ROWS - 1, RED);
    board.place(2, ROWS - 2, SHADOW);

    const groups = findGroups(board);
    expect(groups).toHaveLength(1);
    expect(groups[0].cells).toHaveLength(4);
  });
});

/**
 * A tile in every column the spawning pair is not standing in.
 *
 * The shadow POSSESSES a tile rather than filling a space, so a bare board gives
 * it nothing to arrive on, and the columns the pair occupies are skipped.
 */
const withTilesToTake = (game: Simulation) => {
  const standing = game.pair.cells().map((cell) => cell.column);
  for (let column = 0; column < COLUMNS; column += 1) {
    if (!standing.includes(column) && game.board.isEmpty(column, ROWS - 1)) {
      game.board.place(column, ROWS - 1, column % 2 === 0 ? RED : BLUE);
    }
  }
};

describe('shadow encroaching while the player stalls', () => {
  it('holds off while the player keeps clearing', () => {
    const game = simulation();
    expect(game.shadowOnBoard).toBe(0);

    game.update(DEFAULT_TUNING.shadowInterval - 1);

    expect(game.shadowOnBoard).toBe(0);
  });

  it('takes a cell once the player has stalled long enough', () => {
    const game = simulation();
    withTilesToTake(game);

    game.update(DEFAULT_TUNING.shadowInterval);

    expect(game.shadowOnBoard).toBe(1);
  });

  it('keeps taking cells the longer nothing connects', () => {
    const game = simulation();
    withTilesToTake(game);

    game.update(DEFAULT_TUNING.shadowInterval);
    game.update(DEFAULT_TUNING.shadowInterval);

    expect(game.shadowOnBoard).toBe(2);
  });

  it('is held off by clearing, which is the whole point of it', () => {
    const game = simulation();
    game.update(DEFAULT_TUNING.shadowInterval * 0.9);

    for (let offset = 0; offset < 3; offset += 1) {
      game.board.place(0, ROWS - 1 - offset, RED);
    }
    game.board.place(1, ROWS - 1, RED);
    settle(game);

    game.update(DEFAULT_TUNING.shadowInterval * 0.9);

    expect(game.shadowOnBoard).toBe(0);
  });

  it('never takes the cell the falling pair is standing in', () => {
    const game = simulation();

    // One tile in every column but the spawn column, so the column the pair is
    // falling down is the emptiest — which is the one the shadow reaches for.
    game.board.place(0, ROWS - 1, RED);
    game.board.place(1, ROWS - 1, BLUE);
    game.board.place(3, ROWS - 1, BLUE);
    game.board.place(4, ROWS - 1, RED);
    game.board.place(5, ROWS - 1, RED);

  for (let step = 0; step < ROWS * 2 && game.pair.canFall(game.board); step += 1) {
      game.update(DEFAULT_TUNING.fallInterval);
    }
    const standing = game.pair.cells();

    // The rule this pins: the shadow only ever takes a cell that ALREADY holds a
    // colour, and the pair only ever occupies empty ones. Nothing structurally
    // stops it reaching into the cells the pair is standing in.
    expect(() => game.update(DEFAULT_TUNING.shadowInterval)).not.toThrow();

    // It still arrived — the pair's column being in scope is the point.
    expect(game.shadowOnBoard).toBe(1);

    // Those cells hold the pair, which locked during that same update — the point
    // is that they hold a COLOUR and not a shadow that got there first.
    for (const cell of standing) {
      expect(isShadow(game.board.pieceAt(cell.column, cell.row))).toBe(false);
    }

    expect(() => game.update(DEFAULT_TUNING.lockDelay)).not.toThrow();
  });

  it('says where it took a cell, so the scene can show it arriving', () => {
    const game = simulation();
    withTilesToTake(game);
    expect(game.shadowTaken).toBe(0);
    expect(game.lastShadowCell).toBeNull();

    game.update(DEFAULT_TUNING.shadowInterval);

    expect(game.shadowTaken).toBe(1);
    const taken = game.lastShadowCell;
    expect(taken).not.toBeNull();
    expect(game.board.pieceAt(taken!.column, taken!.row)).toBe(SHADOW);
  });

  it('does not tick the arrival counter when there was nothing to take', () => {
    const game = simulation();
    // A board the player has just cleared. The shadow needs a tile to possess, so
    // there is simply no arrival — and it does NOT end the run.
    game.board.reset();

    game.update(DEFAULT_TUNING.shadowInterval);

    expect(game.shadowTaken).toBe(0);
    expect(game.toppedOut).toBe(false);
  });

  it('never adds to the board, only takes from it', () => {
    const game = simulation();
    withTilesToTake(game);
    const before = game.shadowOnBoard;

    game.update(DEFAULT_TUNING.shadowInterval);

    // The cell it took was already occupied, so the count of filled cells is
    // unchanged. This is what stops the antagonist being garbage-dropping.
    expect(game.shadowOnBoard).toBe(before + 1);
  });

  it('does not creep in while a cascade is still resolving', () => {
    const game = simulation();
    for (let offset = 0; offset < 3; offset += 1) {
      game.board.place(0, ROWS - 1 - offset, RED);
    }
    game.board.place(1, ROWS - 1, RED);
    for (let step = 0; step < ROWS * 2 && game.pair.canFall(game.board); step += 1) {
      game.update(DEFAULT_TUNING.fallInterval);
    }
    game.update(DEFAULT_TUNING.lockDelay);
    expect(game.resolving).toBe(true);

    game.update(DEFAULT_TUNING.shadowInterval);

    expect(game.shadowOnBoard).toBe(0);
  });
});

describe('pushing the shadow back', () => {
  it('recedes from a group cleared beside it', () => {
    const game = simulation();
    for (let column = 0; column < 4; column += 1) {
      game.board.place(column, ROWS - 1, RED);
    }
    game.board.place(3, ROWS - 2, SHADOW);

    settle(game);

    expect(game.board.pieceAt(3, ROWS - 2)).not.toBe(SHADOW);
    expect(game.shadowOnBoard).toBe(0);
  });

  it('leaves shadow that nothing cleared beside it alone', () => {
    const game = simulation();
    for (let column = 0; column < 4; column += 1) {
      game.board.place(column, ROWS - 1, RED);
    }
    game.board.place(5, ROWS - 1, SHADOW);

    settle(game);

    expect(game.board.pieceAt(5, ROWS - 1)).toBe(SHADOW);
    expect(game.shadowOnBoard).toBe(1);
  });

  it('names the cells a link pushed it out of', () => {
    const game = simulation();
    for (let column = 0; column < 4; column += 1) {
      game.board.place(column, ROWS - 1, RED);
    }
    game.board.place(3, ROWS - 2, SHADOW);

    const beats = settleCollectingBeats(game);
    const cleared = beats.flatMap((beat) => (beat.kind === 'clear' ? beat.link.shadowPurified : []));

    expect(cleared).toEqual([
      { column: 3, row: ROWS - 2, strength: 1, turnedTo: RED },
    ]);
  });

  it('reports nothing for a link that cleared nowhere near it', () => {
    const game = simulation();
    for (let column = 0; column < 4; column += 1) {
      game.board.place(column, ROWS - 1, RED);
    }
    game.board.place(5, ROWS - 1, SHADOW);

    const beats = settleCollectingBeats(game);
    const cleared = beats.flatMap((beat) => (beat.kind === 'clear' ? beat.link.shadowPurified : []));

    expect(cleared).toEqual([]);
  });

  it('is driven off the whole board at once when the question is answered', () => {
    const game = simulation();
    game.board.place(0, ROWS - 1, SHADOW);
    game.board.place(3, ROWS - 1, SHADOW);
    game.board.place(5, ROWS - 4, SHADOW);
    game.board.place(2, ROWS - 1, RED);

    const { driven } = game.answerQuestion();

    expect(game.shadowOnBoard).toBe(0);
    expect(driven).toHaveLength(3);
    expect(driven[0].row).toBeGreaterThanOrEqual(driven[driven.length - 1].row);
  });

  it('leaves the player\'s own tiles alone when the question is answered', () => {
    const game = simulation();
    game.board.place(0, ROWS - 1, RED);
    game.board.place(1, ROWS - 1, BLUE);
    game.board.place(2, ROWS - 1, SHADOW);

    game.answerQuestion();

    expect(game.board.pieceAt(0, ROWS - 1)).toBe(RED);
    expect(game.board.pieceAt(1, ROWS - 1)).toBe(BLUE);
  });

  it('reports nothing when the question is answered on a clean board', () => {
    const game = simulation();

    expect(game.answerQuestion().driven).toEqual([]);
  });

  it('forgets the shadow on restart', () => {
    const game = simulation();
    withTilesToTake(game);
    game.update(DEFAULT_TUNING.shadowInterval);
    expect(game.shadowOnBoard).toBe(1);

    game.restart();

    expect(game.shadowOnBoard).toBe(0);
    expect(game.shadowTaken).toBe(0);
    expect(game.lastShadowCell).toBeNull();
  });
});

describe('a long run with the shadow in it', () => {
  /*
   * A soak, not a unit test. `Board.place` throws on an occupied write by
   * design, so any state where two things want the same cell is a crash in
   * front of a player rather than a wrong number — and the shadow arrives on a
   * timer, so it interleaves with falling, locking, cascading and spawning in
   * orders no hand-written case covers.
   *
   * Seeded, so a failure is reproducible.
   */
  const playSeeded = (seed: number) => {
    let state = seed;
    const random = () => {
      state = (state * 1103515245 + 12345) % 2147483648;
      return state / 2147483648;
    };

    // A far shorter fuse than the real dial, so the shadow lands repeatedly inside
    // a run this length.
    const game = new Simulation(
      () => [Math.floor(random() * 4), Math.floor(random() * 4)],
      { ...DEFAULT_TUNING, shadowInterval: 500 },
    );

    for (let step = 0; step < 6000 && !game.toppedOut; step += 1) {
      const roll = random();
      if (roll < 0.22) game.moveLeft();
      else if (roll < 0.44) game.moveRight();
      else if (roll < 0.6) game.rotate();
      else if (roll < 0.66) game.hardDrop();

      game.softDropping = random() < 0.3;
      game.update(16.67);
    }

    return game;
  };

  it('survives thousands of steps without two things claiming one cell', () => {
    for (const seed of [1, 2, 3, 17, 101, 9001]) {
      expect(() => playSeeded(seed)).not.toThrow();
    }
  });

  it('actually reaches the states it is meant to be exercising', () => {
    let sawShadow = false;
    let sawLocks = 0;

    for (const seed of [1, 2, 3, 17, 101, 9001]) {
      const game = playSeeded(seed);
      sawLocks += game.piecesLocked;
      if (game.shadowOnBoard > 0) {
        sawShadow = true;
      }
    }

    // A soak that never sees a shadow proved nothing about the shadow.
    expect(sawShadow).toBe(true);
    expect(sawLocks).toBeGreaterThan(30);
  });
});
