import { describe, expect, it } from 'vitest';
import { Board } from './board';
import { COLUMNS, FIRST_VISIBLE_ROW, ROWS, neuronCell } from './grid';
import { clearStep, findGroups, resolveChain, scoreChain } from './matching';

const PIECE_LETTERS: Record<string, number> = {
  R: 0, B: 1, G: 2, Y: 3, N: neuronCell(false), n: neuronCell(true),
};

const boardFrom = (...rows: string[]): Board => {
  const board = new Board();
  const topRow = ROWS - rows.length;

  rows.forEach((line, offset) => {
    [...line.replace(/ /g, '')].forEach((letter, column) => {
      if (letter === '.') {
        return;
      }
      if (!(letter in PIECE_LETTERS)) {
        throw new Error(`Unknown piece letter '${letter}' in board picture`);
      }
      board.place(column, topRow + offset, PIECE_LETTERS[letter]);
    });
  });

  return board;
};

const sizes = (board: Board) =>
  findGroups(board)
    .map((group) => group.cells.length)
    .sort((a, b) => a - b);

describe('finding groups', () => {
  it('finds nothing on an empty board', () => {
    expect(findGroups(new Board())).toEqual([]);
  });

  it('ignores a run shorter than the match size', () => {
    expect(sizes(boardFrom('R R R . . .'))).toEqual([]);
  });

  it('finds a horizontal run', () => {
    expect(sizes(boardFrom('R R R R . .'))).toEqual([4]);
  });

  it('finds a vertical run', () => {
    expect(
      sizes(boardFrom(
        'R . . . . .',
        'R . . . . .',
        'R . . . . .',
        'R . . . . .',
      )),
    ).toEqual([4]);
  });

  it('finds an L shape, because only connection matters', () => {
    expect(
      sizes(boardFrom(
        'R . . . . .',
        'R . . . . .',
        'R R . . . .',
      )),
    ).toEqual([4]);
  });

  it('finds a T shape', () => {
    expect(
      sizes(boardFrom(
        '. R . . . .',
        'R R R . . .',
      )),
    ).toEqual([4]);
  });

  it('does not connect diagonally', () => {
    expect(
      sizes(boardFrom(
        'R . . . . .',
        '. R . . . .',
        '. . R . . .',
        '. . . R . .',
      )),
    ).toEqual([]);
  });

  it('does not merge touching groups of different colours', () => {
    expect(sizes(boardFrom('R R B B . .'))).toEqual([]);
  });

  it('finds two separate groups', () => {
    expect(
      sizes(boardFrom(
        'R R R R . .',
        'B B B B . .',
      )),
    ).toEqual([4, 4]);
  });

  it('counts a group larger than the match size in full', () => {
    expect(sizes(boardFrom('R R R R R .'))).toEqual([5]);
  });

  it('reports which colour matched', () => {
    const [group] = findGroups(boardFrom('B B B B . .'));
    expect(group.pieceType).toBe(PIECE_LETTERS.B);
  });

  it('rejects a picture containing an unknown piece letter', () => {
    expect(() => boardFrom('R R R P . .')).toThrow();
  });
});

describe('resolving a chain', () => {
  it('reports no links when nothing matches', () => {
    expect(resolveChain(boardFrom('R R B B . .'))).toEqual([]);
  });

  it('clears a matched group off the board', () => {
    const board = boardFrom('R R R R . .');
    resolveChain(board);
    for (let column = 0; column < COLUMNS; column += 1) {
      expect(board.isEmpty(column, ROWS - 1)).toBe(true);
    }
  });

  it('is a single link when nothing falls into a new match', () => {
    expect(resolveChain(boardFrom('R R R R . .'))).toHaveLength(1);
  });

  it('chains when clearing the B group drops the stranded R into the R group', () => {
    const board = boardFrom(
      '. R . . . .',
      'R B . . . .',
      'R B . . . .',
      'R B B . . .',
    );

    const links = resolveChain(board);

    expect(links).toHaveLength(2);
    expect(links[0].groups[0].pieceType).toBe(PIECE_LETTERS.B);
    expect(links[1].groups[0].pieceType).toBe(PIECE_LETTERS.R);
  });

  it('leaves the board settled afterwards', () => {
    const board = boardFrom(
      '. R . . . .',
      'R B . . . .',
      'R B . . . .',
      'R B B . . .',
    );

    resolveChain(board);

    for (let column = 0; column < COLUMNS; column += 1) {
      for (let row = 0; row < ROWS - 1; row += 1) {
        if (!board.isEmpty(column, row)) {
          expect(board.isEmpty(column, row + 1)).toBe(false);
        }
      }
    }
  });

  it('counts the cells cleared in each link', () => {
    const [link] = resolveChain(boardFrom('R R R R R .'));
    expect(link.cellsCleared).toBe(5);
  });
});

describe('scoring a chain', () => {
  it('scores nothing for no links', () => {
    expect(scoreChain([])).toBe(0);
  });

  it('scores a deeper chain far above the sum of its clears', () => {
    const oneLink = resolveChain(boardFrom('R R R R . .'));
    const twoLinks = resolveChain(
      boardFrom(
        '. R . . . .',
        'R B . . . .',
        'R B . . . .',
        'R B B . . .',
      ),
    );

    expect(scoreChain(twoLinks)).toBeGreaterThan(scoreChain(oneLink) * 2);
  });
});

describe('clearing without settling', () => {
  const hangingTrigger = () =>
    boardFrom(
      '. R . . . .',
      'R B . . . .',
      'R B . . . .',
      'R B B . . .',
    );

  it('removes the matched group', () => {
    const board = hangingTrigger();
    clearStep(board, 0);
    expect(board.isEmpty(1, ROWS - 1)).toBe(true);
  });

  it('leaves the tile above the hole hanging, so the drop can be seen', () => {
    const board = hangingTrigger();
    clearStep(board, 0);
    expect(board.pieceAt(1, ROWS - 4)).toBe(PIECE_LETTERS.R);
  });

  it('reports nothing when there is no group to clear', () => {
    expect(clearStep(boardFrom('R R B B . .'), 0)).toBeNull();
  });

  it('settling afterwards drops the hanging tile to the floor', () => {
    const board = hangingTrigger();
    clearStep(board, 0);
    board.settle();
    expect(board.pieceAt(1, ROWS - 1)).toBe(PIECE_LETTERS.R);
  });
});

describe('the hidden row is inert', () => {
  const RED = PIECE_LETTERS.R;

  const threeVisibleReds = () => {
    const board = new Board();
    for (let offset = 0; offset < 3; offset += 1) {
      board.place(0, FIRST_VISIBLE_ROW + offset, RED);
    }
    return board;
  };

  it('does not count a hidden-row tile toward a group', () => {
    const board = threeVisibleReds();
    board.place(0, FIRST_VISIBLE_ROW - 1, RED);

    expect(findGroups(board)).toEqual([]);
  });

  it('clears once a fourth tile joins inside the visible field', () => {
    const board = threeVisibleReds();
    board.place(1, FIRST_VISIBLE_ROW, RED);

    expect(findGroups(board)).toHaveLength(1);
  });

  it('leaves a hidden-row tile on the board when the group below clears', () => {
    const board = threeVisibleReds();
    board.place(1, FIRST_VISIBLE_ROW, RED);
    board.place(0, FIRST_VISIBLE_ROW - 1, RED);

    clearStep(board, 0);

    expect(board.pieceAt(0, FIRST_VISIBLE_ROW - 1)).toBe(RED);
  });

  it('never starts a group from a hidden-row tile', () => {
    const board = new Board();
    for (let column = 0; column < 4; column += 1) {
      board.place(column, FIRST_VISIBLE_ROW - 1, RED);
    }

    expect(findGroups(board)).toEqual([]);
  });
});

describe('reaching a neuron', () => {
  it('lights one a cleared group was touching', () => {
    const board = boardFrom('N R R R R .');

    const link = clearStep(board, 0);

    expect(link?.neuronsLit).toEqual([{ column: 0, row: ROWS - 1 }]);
  });

  it('lights every neuron the same clear reached', () => {
    const board = boardFrom('N R R R R N');

    expect(clearStep(board, 0)?.neuronsLit).toHaveLength(2);
  });

  it('leaves a neuron the clear never touched dark', () => {
    const board = boardFrom(
      'N . . . . .',
      '. R R R R .',
    );

    expect(clearStep(board, 0)?.neuronsLit).toEqual([]);
  });

  it('reports the neuron on the LINK that reached it, not the first', () => {
    const board = boardFrom(
      'N B . . . .',
      'B R . . . .',
      'B R . . . .',
      'B R R R . .',
    );

    const links = resolveChain(board);

    expect(links).toHaveLength(2);
    expect(links[0].neuronsLit).toEqual([]);
    expect(links[1].neuronsLit).toEqual([{ column: 0, row: ROWS - 4 }]);
  });

  it('does not report one that was already lit', () => {
    const board = boardFrom('n R R R R .');

    expect(clearStep(board, 0)?.neuronsLit).toEqual([]);
  });
});
