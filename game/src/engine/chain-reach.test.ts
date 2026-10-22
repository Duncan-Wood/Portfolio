import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ROWS } from './grid';
import { DEFAULT_TUNING } from '../tuning';
import * as matching from './matching';
import { Simulation } from './simulation';

vi.mock('./matching', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./matching')>();
  return { ...actual, clearStep: vi.fn(actual.clearStep) };
});

const RED = 0;
const BLUE = 1;

describe('how the simulation asks for each link of a chain', () => {
  beforeEach(() => {
    vi.mocked(matching.clearStep).mockClear();
  });

  const buildTwoLinkChain = () => {
    const game = new Simulation(() => [RED, BLUE], DEFAULT_TUNING);
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
    for (let step = 0; step < ROWS * 2 && game.pair.canFall(game.board); step += 1) {
      game.update(DEFAULT_TUNING.fallInterval);
    }
    game.update(DEFAULT_TUNING.lockDelay);
  };

  it('numbers the links from zero, so a chain can reach further as it grows', () => {
    const game = buildTwoLinkChain();
    lockCurrentPair(game);
    lockCurrentPair(game);

    for (let beat = 0; beat < 6; beat += 1) {
      game.update(DEFAULT_TUNING.chainLinkDelay);
      game.update(DEFAULT_TUNING.settleDelay);
    }

    const linkNumbers = vi.mocked(matching.clearStep).mock.calls.map(([, linkIndex]) => linkIndex);
    expect(linkNumbers.slice(0, 2)).toEqual([0, 1]);
  });
});
