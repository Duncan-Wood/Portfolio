import { describe, expect, it } from 'vitest';
import {
  COLUMNS,
  PIECE_TYPE_COUNT,
  ROWS,
  SHADOW,
  isColour,
  isShadow,
  shadowCell,
  shadowHolding,
} from './grid';
import { Board } from './board';
import { clearStep } from './matching';
import { Simulation } from './simulation';
import { DEFAULT_TUNING } from '../tuning';

const RED = 0;
const BLUE = 1;

describe('the shadow cell', () => {
  it('starts where the colours stop', () => {
    expect(SHADOW).toBe(PIECE_TYPE_COUNT);
    expect(shadowCell(0)).toBe(SHADOW);
  });

  it('gives every colour it can stand on its own number', () => {
    const values = new Set<number>();
    for (let holding = 0; holding < PIECE_TYPE_COUNT; holding += 1) {
      values.add(shadowCell(holding));
    }
    expect(values.size).toBe(PIECE_TYPE_COUNT);
  });

  it('remembers the colour underneath it', () => {
    for (let holding = 0; holding < PIECE_TYPE_COUNT; holding += 1) {
      expect(shadowHolding(shadowCell(holding))).toBe(holding);
    }
  });

  it('reads as shadow and never as colour', () => {
    for (let holding = 0; holding < PIECE_TYPE_COUNT; holding += 1) {
      expect(isShadow(shadowCell(holding))).toBe(true);
      expect(isColour(shadowCell(holding))).toBe(false);
    }
  });

  it('does not claim a colour or an empty cell as its own', () => {
    expect(isShadow(RED)).toBe(false);
    expect(isShadow(PIECE_TYPE_COUNT - 1)).toBe(false);
    expect(isShadow(null)).toBe(false);
  });
});

describe('a clear beside a shadow', () => {
  const boardWithShadowBeside = (holding: number) => {
    const board = new Board();
    const row = ROWS - 1;
    for (let column = 0; column < 4; column += 1) {
      board.place(column, row, RED);
    }
    board.place(4, row, shadowCell(holding));
    return { board, row };
  };

  it('gives back the colour underneath, not the colour that reached it', () => {
    const { board, row } = boardWithShadowBeside(BLUE);

    clearStep(board);

    expect(board.pieceAt(4, row)).toBe(BLUE);
  });

  it('reports the colour it gave back', () => {
    const { board, row } = boardWithShadowBeside(BLUE);

    const link = clearStep(board);

    expect(link?.shadowPurified).toEqual([{ column: 4, row, turnedTo: BLUE }]);
  });

  it('reports a shadow once however many cleared cells touch it', () => {
    const board = new Board();
    const row = ROWS - 1;
    for (let column = 0; column < 4; column += 1) {
      board.place(column, row, RED);
    }
    board.place(3, row - 1, shadowCell(BLUE));
    board.place(2, row - 1, RED);

    const link = clearStep(board);

    expect(link?.shadowPurified).toHaveLength(1);
  });

  it('reports nothing when the clear touches no shadow at all', () => {
    const board = new Board();
    for (let column = 0; column < 4; column += 1) {
      board.place(column, ROWS - 1, RED);
    }

    expect(clearStep(board)?.shadowPurified).toEqual([]);
  });
});

describe('what the shadow is reaching for', () => {
  const simulation = () => new Simulation(() => [RED, BLUE], DEFAULT_TUNING);

  it('names nothing on a board with nothing to take', () => {
    expect(simulation().threatenedCell).toBeNull();
  });

  it('names a settled cell it could take', () => {
    const game = simulation();
    game.board.place(0, ROWS - 1, RED);

    const target = game.threatenedCell;

    expect(target).not.toBeNull();
    expect(game.board.pieceAt(target!.column, target!.row)).toBe(RED);
  });

  it('reports how close the next arrival is, from nothing to one', () => {
    const game = simulation();
    game.board.place(0, ROWS - 1, RED);

    expect(game.stallProgress).toBe(0);

    game.update(DEFAULT_TUNING.shadowInterval / 2);

    expect(game.stallProgress).toBeGreaterThan(0);
    expect(game.stallProgress).toBeLessThanOrEqual(1);
  });
});

describe('answering the question', () => {
  it('drops the tiles that were resting on what it drove off', () => {
    const game = new Simulation(() => [RED, BLUE], DEFAULT_TUNING);
    game.board.place(0, ROWS - 1, shadowCell(RED));
    game.board.place(0, ROWS - 2, BLUE);

    const { driven, settled } = game.answerQuestion();

    expect(driven).toHaveLength(1);
    expect(settled.length).toBeGreaterThan(0);
    expect(game.board.pieceAt(0, ROWS - 1)).toBe(BLUE);
  });

  it('leaves a board with no shadow on it untouched', () => {
    const game = new Simulation(() => [RED, BLUE], DEFAULT_TUNING);
    for (let column = 0; column < COLUMNS; column += 1) {
      game.board.place(column, ROWS - 1, RED);
    }

    expect(game.answerQuestion().driven).toEqual([]);
    expect(game.board.pieceAt(0, ROWS - 1)).toBe(RED);
  });
});
