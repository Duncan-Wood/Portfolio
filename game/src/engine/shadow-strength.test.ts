import { describe, expect, it } from 'vitest';
import {
  COLUMNS,
  FIRST_VISIBLE_ROW,
  MAX_SHADOW_STRENGTH,
  PIECE_TYPE_COUNT,
  ROWS,
  SHADOW,
  isColour,
  isShadow,
  shadowCell,
  shadowHolding,
  shadowStrength,
} from './grid';
import { Board } from './board';
import { clearStep, findGroups } from './matching';
import { Simulation } from './simulation';
import { DEFAULT_TUNING } from '../tuning';


const RED = 0;
const BLUE = 1;

/**
 * Four reds in a row along the bottom, with whatever is passed sitting beside
 * them. One clear, one shadow, nothing else to explain a result.
 */
const boardWithShadowBeside = (shadow: number): Board => {
  const board = new Board();
  for (let column = 0; column < 4; column += 1) {
    board.place(column, ROWS - 1, RED);
  }
  board.place(4, ROWS - 1, shadow);
  return board;
};

/** A shadow of `strength` standing on a teal tile. */
const shadowOnTeal = (strength: number) => shadowCell(strength, BLUE);

/** Lock whatever is falling and run the cascade it starts to the end. */
const settleAll = (game: Simulation) => {
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

describe('the shadow number space', () => {
  it('round-trips both strength and the colour underneath', () => {
    for (let strength = 1; strength <= MAX_SHADOW_STRENGTH; strength += 1) {
      for (let holding = 0; holding < PIECE_TYPE_COUNT; holding += 1) {
        const cell = shadowCell(strength, holding);
        expect(shadowStrength(cell)).toBe(strength);
        expect(shadowHolding(cell)).toBe(holding);
      }
    }
  });

  it('gives every (strength, colour) pair its own number', () => {
    const seen = new Set<number>();
    for (let strength = 1; strength <= MAX_SHADOW_STRENGTH; strength += 1) {
      for (let holding = 0; holding < PIECE_TYPE_COUNT; holding += 1) {
        seen.add(shadowCell(strength, holding));
      }
    }
    expect(seen.size).toBe(MAX_SHADOW_STRENGTH * PIECE_TYPE_COUNT);
  });

  it('starts the shadow range where the colours stop', () => {
    expect(shadowCell(1, 0)).toBe(SHADOW);
  });

  it('clamps a strength past the top tier rather than inventing a cell value', () => {
    expect(shadowCell(MAX_SHADOW_STRENGTH + 4, RED)).toBe(shadowCell(MAX_SHADOW_STRENGTH, RED));
    expect(shadowCell(0, RED)).toBe(shadowCell(1, RED));
  });

  it('recognises every shadow as shadow and none of them as colour', () => {
    for (let strength = 1; strength <= MAX_SHADOW_STRENGTH; strength += 1) {
      for (let holding = 0; holding < PIECE_TYPE_COUNT; holding += 1) {
        const cell = shadowCell(strength, holding);
        expect(isShadow(cell)).toBe(true);
        expect(isColour(cell)).toBe(false);
      }
    }
  });

  it('does not mistake a colour or an empty cell for shadow', () => {
    for (let colour = 0; colour < PIECE_TYPE_COUNT; colour += 1) {
      expect(isShadow(colour)).toBe(false);
    }
    expect(isShadow(null)).toBe(false);
  });

  it('never lets a shadow form a group, whatever it is standing on', () => {
    const board = new Board();
    for (let column = 0; column < 4; column += 1) {
      // Four shadows all holding the same colour. If the held colour leaked
      // into matching, this would clear itself and the antagonist would
      // dismantle its own foothold.
      board.place(column, ROWS - 1, shadowCell(1, RED));
    }

    expect(findGroups(board)).toHaveLength(0);
  });
});

describe('a link damages shadow by its depth', () => {
  it('breaks a strength-1 shadow with a single clear', () => {
    const board = boardWithShadowBeside(shadowOnTeal(1));

    const link = clearStep(board, 0);

    expect(isShadow(board.pieceAt(4, ROWS - 1))).toBe(false);
    // Strength it broke AT, so the animation can draw the creature that was
    // there, plus the colour handed back — the one it was standing on.
    expect(link?.shadowPurified).toEqual([
      { column: 4, row: ROWS - 1, strength: 1, turnedTo: BLUE },
    ]);
    expect(link?.shadowDamaged).toEqual([]);
  });

  it('only dents a strength-2 shadow with a single clear', () => {
    const board = boardWithShadowBeside(shadowOnTeal(2));

    const link = clearStep(board, 0);

    // Still there, and now one hit from going. This is the whole point of the
    // tier: a single clear is not nothing, but it is not enough.
    expect(board.pieceAt(4, ROWS - 1)).toBe(shadowOnTeal(1));
    expect(link?.shadowPurified).toEqual([]);
    // Strength it has LEFT, which is what the board now holds.
    expect(link?.shadowDamaged).toEqual([{ column: 4, row: ROWS - 1, strength: 1 }]);
  });

  it('breaks a strength-2 shadow with the second link of a chain', () => {
    const board = boardWithShadowBeside(shadowOnTeal(2));

    const link = clearStep(board, 1);

    expect(isShadow(board.pieceAt(4, ROWS - 1))).toBe(false);
    expect(link?.shadowPurified).toEqual([
      { column: 4, row: ROWS - 1, strength: 2, turnedTo: BLUE },
    ]);
  });

  it('lets a single clear wear down the strongest tier rather than bouncing off', () => {
    // The rule that keeps the tiers fair: a chain is the FASTER answer, never
    // the only one. Enough ordinary clears against the same cell always win.
    const board = boardWithShadowBeside(shadowOnTeal(MAX_SHADOW_STRENGTH));

    for (let hit = 0; hit < MAX_SHADOW_STRENGTH; hit += 1) {
      expect(board.pieceAt(4, ROWS - 1)).not.toBeNull();
      // Lay the four reds again where the last clear took them from.
      for (let column = 0; column < 4; column += 1) {
        if (board.isEmpty(column, ROWS - 1)) {
          board.place(column, ROWS - 1, RED);
        }
      }
      clearStep(board, 0);
    }

    expect(isShadow(board.pieceAt(4, ROWS - 1))).toBe(false);
  });

  it('lets one chain link of matching depth do all of it at once', () => {
    const board = boardWithShadowBeside(shadowOnTeal(MAX_SHADOW_STRENGTH));

    clearStep(board, MAX_SHADOW_STRENGTH - 1);

    expect(isShadow(board.pieceAt(4, ROWS - 1))).toBe(false);
  });

  it('hits a shadow once per link however many cleared cells touch it', () => {
    // A shadow in a pocket with cleared tiles above, left and below it. If
    // damage were counted per adjacent cell this would take three hits and a
    // fat single clear would beat a chain — which is the thing chains exist
    // to be better than.
    const board = new Board();
    board.place(0, ROWS - 1, RED);
    board.place(1, ROWS - 1, RED);
    board.place(1, ROWS - 2, RED);
    board.place(1, ROWS - 3, RED);
    board.place(2, ROWS - 2, shadowOnTeal(MAX_SHADOW_STRENGTH));

    const link = clearStep(board, 0);

    expect(board.pieceAt(2, ROWS - 2)).toBe(shadowOnTeal(MAX_SHADOW_STRENGTH - 1));
    expect(link?.shadowDamaged).toEqual([
      { column: 2, row: ROWS - 2, strength: MAX_SHADOW_STRENGTH - 1 },
    ]);
  });

  it('reports nothing when the clear touches no shadow at all', () => {
    const board = new Board();
    for (let column = 0; column < 4; column += 1) {
      board.place(column, ROWS - 1, RED);
    }

    const link = clearStep(board, 0);

    expect(link?.shadowPurified).toEqual([]);
    expect(link?.shadowDamaged).toEqual([]);
  });
});

describe('arrivals get stronger the longer a run hesitates', () => {
  const stalling = () => new Simulation(() => [RED, RED], DEFAULT_TUNING);

  /** Every shadow on the board, weakest first, as plain strengths. */
  const strengthsOn = (game: Simulation): number[] => {
    const found: number[] = [];
    for (let row = 0; row < ROWS; row += 1) {
      for (let column = 0; column < COLUMNS; column += 1) {
        const cell = game.board.pieceAt(column, row);
        if (isShadow(cell)) {
          found.push(shadowStrength(cell));
        }
      }
    }
    return found.sort();
  };

  /**
   * Stall out one arrival, keeping a supply of tiles for it to take.
   *
   * Two things this has to control for. One `shadowInterval` is fifteen rows
   * of gravity, so a game left alone tops out from its own stack long before
   * the shadow escalates. And the shadow now POSSESSES a tile rather than
   * filling a space, so a board swept completely clean gives it nothing to
   * arrive on. Sweeping the stack but re-seeding the bottom row leaves exactly
   * one variable — how many arrivals have happened — which is what these
   * tests are about.
   */
  const stallOneArrival = (game: Simulation) => {
    // Four rotating colours, so no two neighbours match and the seed row can
    // never form a group. Seeding one colour made the row clear itself, which
    // purified the very shadows these tests were counting.
    for (let column = 0; column < COLUMNS; column += 1) {
      if (game.board.isEmpty(column, ROWS - 1)) {
        game.board.place(column, ROWS - 1, column % PIECE_TYPE_COUNT);
      }
    }

    game.update(DEFAULT_TUNING.shadowInterval);

    for (let row = FIRST_VISIBLE_ROW; row < ROWS - 1; row += 1) {
      for (let column = 0; column < COLUMNS; column += 1) {
        if (isColour(game.board.pieceAt(column, row))) {
          game.board.clear(column, row);
        }
      }
    }
  };

  it('opens with the weakest, so a single clear is enough to learn on', () => {
    const game = stalling();

    stallOneArrival(game);

    expect(strengthsOn(game)).toEqual([1]);
  });

  it('holds the weakest tier for a whole schedule of arrivals', () => {
    const game = stalling();

    for (let arrival = 0; arrival < DEFAULT_TUNING.arrivalsPerShadowStrength; arrival += 1) {
      stallOneArrival(game);
    }

    expect(strengthsOn(game).every((strength) => strength === 1)).toBe(true);
  });

  it('steps up a tier once that schedule is spent', () => {
    const game = stalling();

    for (let arrival = 0; arrival <= DEFAULT_TUNING.arrivalsPerShadowStrength; arrival += 1) {
      stallOneArrival(game);
    }

    expect(strengthsOn(game)).toContain(2);
  });

  it('never exceeds the strongest tier however long the run drags', () => {
    const game = stalling();

    for (let arrival = 0; arrival < 40 && !game.toppedOut; arrival += 1) {
      stallOneArrival(game);
    }

    expect(Math.max(...strengthsOn(game))).toBeLessThanOrEqual(MAX_SHADOW_STRENGTH);
  });

  it('takes a tile rather than an empty cell, so the board never grows', () => {
    const game = stalling();
    for (let column = 0; column < COLUMNS; column += 1) {
      game.board.place(column, ROWS - 1, BLUE);
    }
    const filled = () => {
      let count = 0;
      for (let row = 0; row < ROWS; row += 1) {
        for (let column = 0; column < COLUMNS; column += 1) {
          if (!game.board.isEmpty(column, row)) {
            count += 1;
          }
        }
      }
      return count;
    };
    const before = filled();

    game.update(DEFAULT_TUNING.shadowInterval);

    // One more filled cell would mean it dropped junk on the board. It takes.
    expect(game.shadowOnBoard).toBe(1);
    expect(filled()).toBe(before);
  });

  it('does nothing at all when there is no tile to take', () => {
    const game = stalling();
    // A board the player has just cleared. The one who stops without finishing
    // has no business winning here, so the arrival is simply skipped — and it
    // must not end the run, which is what the old "nowhere to land" rule did.
    game.board.reset();

    game.update(DEFAULT_TUNING.shadowInterval);

    expect(game.shadowOnBoard).toBe(0);
    expect(game.toppedOut).toBe(false);
  });

  it('drives off every strength at once when the question is answered', () => {
    const game = stalling();
    for (let arrival = 0; arrival <= DEFAULT_TUNING.arrivalsPerShadowStrength; arrival += 1) {
      stallOneArrival(game);
    }
    expect(game.shadowOnBoard).toBeGreaterThan(0);

    const { driven } = game.answerQuestion();

    expect(game.shadowOnBoard).toBe(0);
    expect(driven.length).toBeGreaterThan(0);
  });
});

describe('light gives back what the shadow took', () => {
  it('restores the colour underneath, not the colour that reached it', () => {
    // Red clears beside a shadow standing on teal. The cell comes back TEAL:
    // driving the shadow off returns what it took, it does not mint something
    // new. This is the difference between the antagonist being defeated and
    // the board being repaired.
    const board = boardWithShadowBeside(shadowOnTeal(1));

    clearStep(board, 0);

    expect(board.pieceAt(4, ROWS - 1)).toBe(BLUE);
  });

  it('reports the colour it gave back', () => {
    const board = boardWithShadowBeside(shadowOnTeal(1));

    const link = clearStep(board, 0);

    expect(link?.shadowPurified).toEqual([
      { column: 4, row: ROWS - 1, strength: 1, turnedTo: BLUE },
    ]);
  });

  it('keeps the held colour through a hit that only dents it', () => {
    const board = boardWithShadowBeside(shadowOnTeal(2));

    clearStep(board, 0);

    const cell = board.pieceAt(4, ROWS - 1) as number;
    expect(isShadow(cell)).toBe(true);
    expect(shadowStrength(cell)).toBe(1);
    // It got weaker; it did not change what it is standing on.
    expect(shadowHolding(cell)).toBe(BLUE);
  });

  it('lets a restored tile complete a group and extend the cascade', () => {
    // Three teals around a shadow that is standing on teal. Freeing it makes
    // the fourth — a chain that grew because it drove the shadow back, which
    // is the reward this whole mechanic exists to hand out.
    const board = new Board();
    for (let column = 0; column < 4; column += 1) {
      board.place(column, ROWS - 1, RED);
    }
    board.place(4, ROWS - 1, shadowOnTeal(1));
    board.place(4, ROWS - 2, BLUE);
    board.place(5, ROWS - 1, BLUE);
    board.place(5, ROWS - 2, BLUE);

    clearStep(board, 0);

    expect(board.pieceAt(4, ROWS - 1)).toBe(BLUE);
    expect(findGroups(board)).toHaveLength(1);
  });

  it('still empties the cell outright when the question is answered', () => {
    // Answering is a different verb from playing: play GIVES BACK what the
    // shadow took, an answer BANISHES it. Restoring a whole board of held
    // colour at once would hand back a wall of tiles the player never placed.
    const game = new Simulation(() => [RED, RED], DEFAULT_TUNING);
    game.board.place(0, ROWS - 1, shadowCell(1, RED));
    game.board.place(1, ROWS - 1, shadowCell(2, BLUE));

    game.answerQuestion();

    expect(game.board.isEmpty(0, ROWS - 1)).toBe(true);
    expect(game.board.isEmpty(1, ROWS - 1)).toBe(true);
  });
});

describe('the shadow tells you where it is reaching', () => {
  const stalling = () => new Simulation(() => [RED, RED], DEFAULT_TUNING);

  const seedBottomRow = (game: Simulation) => {
    for (let column = 0; column < COLUMNS; column += 1) {
      if (game.board.isEmpty(column, ROWS - 1)) {
        game.board.place(column, ROWS - 1, column % PIECE_TYPE_COUNT);
      }
    }
  };

  it('names the cell it would take next', () => {
    const game = stalling();
    seedBottomRow(game);

    const threatened = game.threatenedCell;

    expect(threatened).not.toBeNull();
    // The board has to be able to point at it before it happens, or the six
    // seconds of pressure this game runs on are invisible.
    expect(isColour(game.board.pieceAt(threatened!.column, threatened!.row))).toBe(true);
  });

  it('names the cell it actually goes on to take', () => {
    const game = stalling();
    seedBottomRow(game);
    const threatened = game.threatenedCell!;

    game.update(DEFAULT_TUNING.shadowInterval);

    expect(game.lastShadowCell).toEqual(threatened);
  });

  it('reaches for nothing when there is nothing to take', () => {
    const game = stalling();
    game.board.reset();

    expect(game.threatenedCell).toBeNull();
  });

  it('reports how close the next arrival is, from nothing to one', () => {
    const game = stalling();
    seedBottomRow(game);
    expect(game.stallProgress).toBe(0);

    game.update(DEFAULT_TUNING.shadowInterval / 2);

    expect(game.stallProgress).toBeGreaterThan(0.4);
    expect(game.stallProgress).toBeLessThan(0.6);
  });

  it('drops back to nothing when something clears', () => {
    const game = stalling();
    for (let column = 0; column < 3; column += 1) {
      game.board.place(column, ROWS - 1, RED);
    }
    game.update(DEFAULT_TUNING.shadowInterval * 0.8);
    expect(game.stallProgress).toBeGreaterThan(0.5);

    game.board.place(3, ROWS - 1, RED);
    settleAll(game);

    // Connecting is the counter-play, so the warning has to visibly reset.
    expect(game.stallProgress).toBeLessThan(0.2);
  });
});

describe('answering leaves the board standing up', () => {
  it('drops the tiles that were resting on what it drove off', () => {
    const game = new Simulation(() => [RED, RED], DEFAULT_TUNING);
    // A shadow on the floor with an ordinary tile stacked on top of it.
    game.board.place(0, ROWS - 1, shadowCell(1, RED));
    game.board.place(0, ROWS - 2, BLUE);

    game.answerQuestion();

    // Without a settle the blue hangs in mid-air until the next lock snaps it
    // down with no animation, which is what the player sees as a glitch.
    expect(game.board.pieceAt(0, ROWS - 1)).toBe(BLUE);
    expect(game.board.isEmpty(0, ROWS - 2)).toBe(true);
  });

  it('reports the drop so the scene can animate it', () => {
    const game = new Simulation(() => [RED, RED], DEFAULT_TUNING);
    game.board.place(0, ROWS - 1, shadowCell(1, RED));
    game.board.place(0, ROWS - 2, BLUE);

    const { settled } = game.answerQuestion();

    expect(settled).toEqual([{ column: 0, fromRow: ROWS - 2, toRow: ROWS - 1 }]);
  });

  it('still names every shadow it drove off', () => {
    const game = new Simulation(() => [RED, RED], DEFAULT_TUNING);
    game.board.place(0, ROWS - 1, shadowCell(1, RED));
    game.board.place(1, ROWS - 1, shadowCell(2, BLUE));

    const { driven } = game.answerQuestion();

    expect(driven).toHaveLength(2);
    expect(game.shadowOnBoard).toBe(0);
  });
});
