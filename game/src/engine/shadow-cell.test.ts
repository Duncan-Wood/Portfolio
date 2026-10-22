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

describe('a chain reaching further into the shadow with every link', () => {
  const bottom = ROWS - 1;

  const redRowWithShadowAt = (column: number, row: number) => {
    const board = new Board();
    for (let at = 0; at < 4; at += 1) {
      board.place(at, bottom, RED);
    }
    board.place(column, row, shadowCell(BLUE));
    return board;
  };

  const wasPurified = (board: Board, column: number, row: number) => !isShadow(board.pieceAt(column, row));

  it('takes only the shadow beside a clear on the first link', () => {
    const diagonal = redRowWithShadowAt(4, bottom - 1);
    clearStep(diagonal, 0);

    expect(wasPurified(diagonal, 4, bottom - 1)).toBe(false);
  });

  it('takes the shadow touching a clear at a corner from the second link', () => {
    const board = redRowWithShadowAt(4, bottom - 1);
    clearStep(board, 1);

    expect(wasPurified(board, 4, bottom - 1)).toBe(true);
  });

  it('leaves a shadow two cells away alone on the second link', () => {
    const board = redRowWithShadowAt(5, bottom);
    clearStep(board, 1);

    expect(wasPurified(board, 5, bottom)).toBe(false);
  });

  it('takes a shadow two cells away from the third link', () => {
    const board = redRowWithShadowAt(5, bottom);
    clearStep(board, 2);

    expect(wasPurified(board, 5, bottom)).toBe(true);
  });

  it('takes a shadow two cells away on a diagonal too, from the third link', () => {
    const board = redRowWithShadowAt(5, bottom - 2);
    clearStep(board, 2);

    expect(wasPurified(board, 5, bottom - 2)).toBe(true);
  });

  it('never reaches three cells, however long the chain', () => {
    const board = redRowWithShadowAt(0, bottom - 3);
    clearStep(board, 9);

    expect(wasPurified(board, 0, bottom - 3)).toBe(false);
  });

  it('reports every shadow cell it took, with the colour it gave back', () => {
    const board = redRowWithShadowAt(4, bottom - 1);

    const link = clearStep(board, 1);

    expect(link?.shadowPurified).toEqual([{ column: 4, row: bottom - 1, turnedTo: BLUE }]);
  });

  it('behaves as the first link when no link number is given', () => {
    const board = redRowWithShadowAt(4, bottom - 1);
    clearStep(board);

    expect(wasPurified(board, 4, bottom - 1)).toBe(false);
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

  it('never names a cell the last piece just landed on', () => {
    const game = simulation();
    const standing = game.pair.cells().map((cell) => cell.column);
    for (let column = 0; column < COLUMNS; column += 1) {
      if (!standing.includes(column)) {
        game.board.place(column, ROWS - 1, RED);
        game.board.place(column, ROWS - 2, BLUE);
        game.board.place(column, ROWS - 3, RED);
      }
    }

    game.hardDrop();

    const target = game.threatenedCell;
    expect(target).not.toBeNull();
    const fresh = game.lastLanded.map((cell) => `${cell.column},${cell.row}`);
    expect(fresh).not.toContain(`${target!.column},${target!.row}`);
  });

  it('names nothing when the only tiles on the board were just landed', () => {
    const game = simulation();

    game.hardDrop();

    expect(game.threatenedCell).toBeNull();
  });

  it('reports how close the next arrival is, from nothing to one', () => {
    const game = simulation();
    game.board.place(0, ROWS - 1, RED);

    expect(game.stallProgress).toBe(0);

    game.hardDrop();

    expect(game.stallProgress).toBeGreaterThan(0);
    expect(game.stallProgress).toBeLessThan(1);
  });
});
