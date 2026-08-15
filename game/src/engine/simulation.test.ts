import { describe, expect, it } from 'vitest';
import { ROWS } from './grid';
import {
  FALL_INTERVAL,
  LOCK_DELAY,
  SOFT_DROP_INTERVAL,
  SPAWN_COLUMN,
  Simulation,
} from './simulation';

const RED = 0;
const BLUE = 1;

const simulation = () => new Simulation(() => [RED, BLUE]);

const dropToFloor = (game: Simulation) => {
  while (game.pair.canFall(game.board)) {
    game.update(FALL_INTERVAL);
  }
};

describe('spawning', () => {
  it('starts with a pair at the top of the spawn column', () => {
    const game = simulation();
    expect(game.pair.column).toBe(SPAWN_COLUMN);
    expect(game.pair.row).toBe(0);
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
    game.update(FALL_INTERVAL - 1);
    expect(game.pair.row).toBe(0);
  });

  it('falls one row once the interval elapses', () => {
    const game = simulation();
    game.update(FALL_INTERVAL);
    expect(game.pair.row).toBe(1);
  });

  it('accumulates time across several updates', () => {
    const game = simulation();
    game.update(FALL_INTERVAL / 2);
    game.update(FALL_INTERVAL / 2);
    expect(game.pair.row).toBe(1);
  });

  it('falls several rows when a large delta arrives at once', () => {
    const game = simulation();
    game.update(FALL_INTERVAL * 3);
    expect(game.pair.row).toBe(3);
  });

  it('falls faster while soft dropping', () => {
    const game = simulation();
    game.softDropping = true;
    game.update(SOFT_DROP_INTERVAL);
    expect(game.pair.row).toBe(1);
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
    game.update(LOCK_DELAY);
    expect(game.board.pieceAt(SPAWN_COLUMN, ROWS - 1)).toBe(RED);
    expect(game.board.pieceAt(SPAWN_COLUMN, ROWS - 2)).toBe(BLUE);
  });

  it('restarts the lock delay after a successful move', () => {
    const game = simulation();
    dropToFloor(game);
    game.update(LOCK_DELAY - 1);
    game.moveLeft();
    game.update(LOCK_DELAY - 1);
    expect(game.board.isEmpty(SPAWN_COLUMN - 1, ROWS - 1)).toBe(true);
  });

  it('does not restart the lock delay after a blocked move', () => {
    const game = simulation();
    game.moveLeft();
    game.moveLeft();
    dropToFloor(game);
    game.update(LOCK_DELAY - 1);
    game.moveLeft();
    game.update(1);
    expect(game.board.isEmpty(0, ROWS - 1)).toBe(false);
  });

  it('spawns a fresh pair after locking', () => {
    const game = simulation();
    dropToFloor(game);
    game.update(LOCK_DELAY);
    expect(game.pair.row).toBe(0);
    expect(game.pair.column).toBe(SPAWN_COLUMN);
  });

  it('stacks the next pair on top of the locked one', () => {
    const game = simulation();
    dropToFloor(game);
    game.update(LOCK_DELAY);
    dropToFloor(game);
    game.update(LOCK_DELAY);
    expect(game.board.pieceAt(SPAWN_COLUMN, ROWS - 3)).toBe(RED);
    expect(game.board.pieceAt(SPAWN_COLUMN, ROWS - 4)).toBe(BLUE);
  });

  it('cancels the lock delay when a move opens space below the pair', () => {
    const game = simulation();
    dropToFloor(game);
    game.update(LOCK_DELAY);

    dropToFloor(game);
    const restingRow = game.pair.row;
    game.update(LOCK_DELAY - 1);
    game.moveLeft();
    game.update(FALL_INTERVAL);

    expect(game.pair.row).toBeGreaterThan(restingRow);
  });
});
