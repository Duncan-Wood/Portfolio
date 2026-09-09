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

    game.board.place(0, ROWS - 1, RED);
    game.board.place(1, ROWS - 1, BLUE);
    game.board.place(3, ROWS - 1, BLUE);
    game.board.place(4, ROWS - 1, RED);
    game.board.place(5, ROWS - 1, RED);

  for (let step = 0; step < ROWS * 2 && game.pair.canFall(game.board); step += 1) {
      game.update(DEFAULT_TUNING.fallInterval);
    }
    const standing = game.pair.cells();

    expect(() => game.update(DEFAULT_TUNING.shadowInterval)).not.toThrow();

    expect(game.shadowOnBoard).toBe(1);

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
      { column: 3, row: ROWS - 2, turnedTo: RED },
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
  const playSeeded = (seed: number) => {
    let state = seed;
    const random = () => {
      state = (state * 1103515245 + 12345) % 2147483648;
      return state / 2147483648;
    };

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

    expect(sawShadow).toBe(true);
    expect(sawLocks).toBeGreaterThan(30);
  });
});
