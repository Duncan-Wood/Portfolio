import { describe, expect, it } from 'vitest';
import { HAT_FULL_CHARGE, chargeFor } from './hat';
import { type ChainLink } from './matching';
import { ROWS, isShadow, shadowCell } from './grid';
import { SPAWN_COLUMN, Simulation } from './simulation';
import { DEFAULT_TUNING } from '../tuning';

const RED = 0;
const BLUE = 1;

const linkClearing = (cellsCleared: number): ChainLink => ({
  groups: [],
  cellsCleared,
  shadowPurified: [],
  neuronsLit: [],
});

const simulation = () => {
  const game = new Simulation(() => [RED, BLUE], DEFAULT_TUNING);
  game.hatUnlocked = true;
  return game;
};

const clearOneGroup = (game: Simulation) => {
  for (let offset = 0; offset < 3; offset += 1) {
    game.board.place(SPAWN_COLUMN, ROWS - 1 - offset, RED);
  }
  for (let step = 0; step < ROWS * 2 && game.pair.canFall(game.board); step += 1) {
    game.update(DEFAULT_TUNING.fallInterval);
  }
  game.update(DEFAULT_TUNING.lockDelay);
  game.update(DEFAULT_TUNING.chainLinkDelay);
};

describe('what a clear is worth', () => {
  it('doubles with every further link of the chain', () => {
    expect(chargeFor(linkClearing(4), 0)).toBe(4);
    expect(chargeFor(linkClearing(4), 1)).toBe(8);
    expect(chargeFor(linkClearing(4), 2)).toBe(16);
  });

  it('fills exactly on a two-link chain', () => {
    expect(chargeFor(linkClearing(4), 0) + chargeFor(linkClearing(4), 1))
      .toBe(HAT_FULL_CHARGE);
  });

  it('is reachable inside the tightest lock the game seeds', () => {
    const fewestPieces = 10;
    expect(HAT_FULL_CHARGE / chargeFor(linkClearing(4), 0)).toBeLessThan(fewestPieces);
  });
});

describe('charging by playing', () => {
  it('gains the cells cleared', () => {
    const game = simulation();
    clearOneGroup(game);
    expect(game.hatCharge).toBe(4);
  });

  it('never banks past a single shot', () => {
    const game = simulation();
    game.hatCharge = HAT_FULL_CHARGE - 1;
    clearOneGroup(game);
    expect(game.hatCharge).toBe(HAT_FULL_CHARGE);
  });

  it('survives the next board, so a run can fill it', () => {
    const game = simulation();
    game.hatCharge = 8;
    game.restart(true);
    expect(game.hatCharge).toBe(8);
  });

  it('empties when the whole run starts over', () => {
    const game = simulation();
    game.hatCharge = HAT_FULL_CHARGE;
    game.restart();
    expect(game.hatCharge).toBe(0);
  });
});

describe('firing', () => {
  const shadowAt = (game: Simulation, row: number, holding: number) => {
    game.board.place(SPAWN_COLUMN, row, shadowCell(holding));
  };

  it('strips the shadow, gives back its colour, and spends the charge', () => {
    const game = simulation();
    game.hatCharge = HAT_FULL_CHARGE;
    shadowAt(game, ROWS - 1, RED);

    expect(game.fireHat()).toEqual({
      column: SPAWN_COLUMN, row: ROWS - 1, turnedTo: RED,
    });
    expect(game.board.pieceAt(SPAWN_COLUMN, ROWS - 1)).toBe(RED);
    expect(game.hatCharge).toBe(0);
  });

  it('takes the nearest shadow, not the deepest', () => {
    const game = simulation();
    game.hatCharge = HAT_FULL_CHARGE;
    shadowAt(game, ROWS - 1, RED);
    shadowAt(game, ROWS - 3, BLUE);

    expect(game.fireHat()?.row).toBe(ROWS - 3);
    expect(isShadow(game.board.pieceAt(SPAWN_COLUMN, ROWS - 1))).toBe(true);
  });

  it('only fires down its own column, and a miss costs nothing', () => {
    const game = simulation();
    game.hatCharge = HAT_FULL_CHARGE;
    game.board.place(SPAWN_COLUMN + 1, ROWS - 1, shadowCell(RED));

    expect(game.fireHat()).toBeNull();
    expect(isShadow(game.board.pieceAt(SPAWN_COLUMN + 1, ROWS - 1))).toBe(true);
    expect(game.hatCharge).toBe(HAT_FULL_CHARGE);
  });

  it('starts a chain when the freed colour completes a group', () => {
    const game = simulation();
    game.hatCharge = HAT_FULL_CHARGE;
    game.board.place(SPAWN_COLUMN, ROWS - 1, RED);
    game.board.place(SPAWN_COLUMN + 1, ROWS - 1, RED);
    game.board.place(SPAWN_COLUMN + 2, ROWS - 1, RED);
    shadowAt(game, ROWS - 2, RED);

    game.fireHat();

    expect(game.resolving).toBe(true);
  });
});

describe('before the hat is earned', () => {
  const locked = () => {
    const game = simulation();
    game.hatUnlocked = false;
    return game;
  };

  it('takes no charge from a clear', () => {
    const game = locked();
    clearOneGroup(game);
    expect(game.hatCharge).toBe(0);
  });

  it('will not fire even if something hands it a full charge', () => {
    const game = locked();
    game.hatCharge = HAT_FULL_CHARGE;
    game.board.place(SPAWN_COLUMN, ROWS - 1, shadowCell(RED));

    expect(game.fireHat()).toBeNull();
    expect(isShadow(game.board.pieceAt(SPAWN_COLUMN, ROWS - 1))).toBe(true);
  });
});

describe('whether a shot is possible', () => {
  it('waits for a full charge', () => {
    const game = simulation();
    game.hatCharge = HAT_FULL_CHARGE - 1;
    expect(game.canFireHat).toBe(false);

    game.hatCharge = HAT_FULL_CHARGE;
    expect(game.canFireHat).toBe(true);
  });

  it('is false mid-chain, so a shot cannot interrupt one', () => {
    const game = simulation();
    clearOneGroup(game);
    game.hatCharge = HAT_FULL_CHARGE;
    game.resolving = true;
    expect(game.canFireHat).toBe(false);
  });
});
