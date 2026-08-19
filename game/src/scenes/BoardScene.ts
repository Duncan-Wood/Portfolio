import { Input, Scene } from 'phaser';
import { COLUMNS, FIRST_VISIBLE_ROW, PIECE_TYPE_COUNT, ROWS, VISIBLE_ROWS } from '../engine/grid';
import { Simulation } from '../engine/simulation';
import { DEFAULT_TUNING, type Tuning } from '../tuning';
import { EMPTY_COLOR, PIECE_COLORS } from '../palette';
import { FIXED_STEP, FixedTimestep } from '../fixed-timestep';
import { type HorizontalDirection, InputTranslator } from '../input/input-translator';

/*
 * The only file where Phaser and game logic meet. (`main.ts` also imports
 * Phaser, but only to build the config object.)
 *
 * Its job is deliberately narrow: read the keyboard, drive the clock, and draw
 * whatever the engine says is true. Every rule — gravity, matching, DAS, the
 * cascade — lives in a Phaser-free module elsewhere, so it can be tested
 * without a browser. If logic starts accumulating here, it is in the wrong
 * place.
 *
 * The scene is a pure function of engine state: `drawBoard` reads the board
 * every frame and paints it. There is no separate copy of the game to keep in
 * sync, which is the class of bug that would otherwise dominate.
 */

const CELL_SIZE = 64;
const GAP = 4;

/*
 * How often the FPS readout is rewritten. Phaser's `Text` rasterises glyphs to
 * an offscreen canvas and uploads them whenever the string CHANGES (`setText`
 * short-circuits on an unchanged one), and `Math.round(actualFps)` changes
 * often enough to be worth throttling — it also stops the readout flickering.
 */
const FPS_REFRESH_INTERVAL = 250;


const BOARD_WIDTH = COLUMNS * CELL_SIZE + (COLUMNS - 1) * GAP;
const BOARD_HEIGHT = VISIBLE_ROWS * CELL_SIZE + (VISIBLE_ROWS - 1) * GAP;
export const CANVAS_WIDTH = 620;
export const CANVAS_HEIGHT = 900;

/**
 * Top-left corner of the board in canvas pixels.
 *
 * The board is left-aligned rather than centred because the preview panel needs
 * room beside it: a 404px board in the original 480px canvas left only 38px of
 * margin. The canvas was widened to 620 and the board pinned left.
 */
const ORIGIN_X = 40;
const ORIGIN_Y = (CANVAS_HEIGHT - BOARD_HEIGHT) / 2;

const PREVIEW_CELL = 48;
const PREVIEW_CENTER_X = ORIGIN_X + BOARD_WIDTH + 88;
const PREVIEW_TOP_Y = ORIGIN_Y + 72;

function centerOfColumn(column: number): number {
  return ORIGIN_X + column * (CELL_SIZE + GAP) + CELL_SIZE / 2;
}

/**
 * Board row to canvas pixel. Offset by `FIRST_VISIBLE_ROW`, so the hidden row
 * maps above the top of the board and is simply never drawn.
 */
function centerOfRow(row: number): number {
  return ORIGIN_Y + (row - FIRST_VISIBLE_ROW) * (CELL_SIZE + GAP) + CELL_SIZE / 2;
}

/** Whether a cell is in the part of the board the player can see. */
function isVisibleRow(row: number): boolean {
  return row >= FIRST_VISIBLE_ROW && row < ROWS;
}

/**
 * Randomness lives here, in the scene, NOT in the engine. The engine takes a
 * supplier function instead, which is what keeps it deterministic and its tests
 * seedless.
 *
 * A module-level function rather than an arrow defined inside the scene: an
 * arrow would capture `this`, and handing that to the long-lived `Simulation`
 * would keep the entire scene — and every object it owns — alive for as long as
 * the simulation existed.
 */
function randomPieceType(): number {
  return Math.floor(Math.random() * PIECE_TYPE_COUNT);
}

function randomPieceTypes(): [number, number] {
  return [randomPieceType(), randomPieceType()];
}

export class BoardScene extends Scene {
  private simulation: Simulation;
  private cellRectangles: Phaser.GameObjects.Rectangle[];
  private pairRectangles: Phaser.GameObjects.Rectangle[];
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private fpsText: Phaser.GameObjects.Text;
  private scoreText: Phaser.GameObjects.Text;
  private chainText: Phaser.GameObjects.Text;
  private gameOverText: Phaser.GameObjects.Text;
  private previewRectangles: Phaser.GameObjects.Rectangle[];
  private shownUpcoming = '';
  private shownScore = -1;
  private shownChain = -1;
  private nextFpsRefresh = 0;
  private timestep: FixedTimestep;
  /**
   * Named `inputTranslator`, NOT `input` — `input` is Phaser's own
   * `Scene.input` plugin, and shadowing it breaks `this.input.keyboard`.
   */
  private inputTranslator: InputTranslator;
  private lastPiecesSpawned = 0;

  /**
   * This scene's own copy of the tuning values, handed to both the simulation
   * and the input translator so all three read the same live object.
   */
  private tuning: Tuning;

  constructor() {
    super('Board');
  }

  /**
   * Phaser calls this once when the scene starts. Everything drawn is allocated
   * here — 72 board cells, 2 pair cells, 2 preview cells and the text — and
   * never again — the frame loop only changes colour and position. Not strictly
   * allocation-free: `drawPair` builds a fresh cells array each frame and
   * `drawPreview` a key string. Both are tiny and short-lived.
   */
  create(): void {
    // A COPY of the defaults, so mutating this scene's tuning at runtime cannot
    // corrupt the shared defaults that the engine tests rely on.
    this.tuning = { ...DEFAULT_TUNING };
    this.simulation = new Simulation(randomPieceTypes, this.tuning);
    this.timestep = new FixedTimestep();
    this.inputTranslator = new InputTranslator(this.tuning);
    this.lastPiecesSpawned = this.simulation.piecesSpawned;
    this.nextFpsRefresh = 0;

    // Live tuning hook. `import.meta.env.DEV` is replaced with `false` at build
    // time, so this branch is removed entirely from the production bundle —
    // verified: `window.tuning` appears zero times in the built output.
    if (import.meta.env.DEV) {
      window.tuning = this.tuning;
    }

    // One rectangle per VISIBLE cell. The hidden row is deliberately not drawn,
    // so it gets no rectangle and the array is indexed from FIRST_VISIBLE_ROW.
    this.cellRectangles = [];
    for (let row = FIRST_VISIBLE_ROW; row < ROWS; row += 1) {
      for (let column = 0; column < COLUMNS; column += 1) {
        this.cellRectangles.push(
          this.add.rectangle(
            centerOfColumn(column),
            centerOfRow(row),
            CELL_SIZE,
            CELL_SIZE,
            EMPTY_COLOR,
          ),
        );
      }
    }

    this.pairRectangles = [
      this.add.rectangle(0, 0, CELL_SIZE, CELL_SIZE, EMPTY_COLOR),
      this.add.rectangle(0, 0, CELL_SIZE, CELL_SIZE, EMPTY_COLOR),
    ];

    this.add.text(PREVIEW_CENTER_X, PREVIEW_TOP_Y - 46, 'NEXT', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#8ea3b0',
    }).setOrigin(0.5, 0.5);

    this.shownUpcoming = '';
    this.previewRectangles = [
      this.add.rectangle(
        PREVIEW_CENTER_X,
        PREVIEW_TOP_Y + PREVIEW_CELL + GAP,
        PREVIEW_CELL,
        PREVIEW_CELL,
        EMPTY_COLOR,
      ),
      this.add.rectangle(PREVIEW_CENTER_X, PREVIEW_TOP_Y, PREVIEW_CELL, PREVIEW_CELL, EMPTY_COLOR),
    ];

    this.cursors = this.input.keyboard!.createCursorKeys();

    this.fpsText = this.add.text(8, 8, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#8ea3b0',
    });

    this.shownScore = -1;
    this.scoreText = this.add.text(CANVAS_WIDTH - 8, 8, '', {
      fontFamily: 'monospace',
      fontSize: '28px',
      color: '#e8eef2',
    }).setOrigin(1, 0);

    this.shownChain = -1;
    this.chainText = this.add.text(ORIGIN_X + BOARD_WIDTH / 2, CANVAS_HEIGHT / 2, '', {
      fontFamily: 'monospace',
      fontSize: '64px',
      color: '#ffc914',
    }).setOrigin(0.5, 0.5).setVisible(false);

    this.gameOverText = this.add.text(
      ORIGIN_X + BOARD_WIDTH / 2,
      CANVAS_HEIGHT / 2,
      'TOPPED OUT',
      {
        fontFamily: 'monospace',
        fontSize: '48px',
        color: '#e8eef2',
        backgroundColor: '#12161a',
        padding: { x: 16, y: 10 },
      },
    ).setOrigin(0.5, 0.5).setVisible(false);
  }

  /**
   * Phaser calls this once per rendered frame. `delta` is milliseconds since
   * the last one.
   *
   * Order matters: input is read FIRST so a keypress affects the very next
   * simulation step rather than waiting a frame, which is the cheapest latency
   * there is to win.
   */
  update(time: number, delta: number): void {
    // Nothing to read once the game is over: the simulation refuses input
    // anyway, and polling on would keep writing `softDropping` to a pair that
    // is already part of the board.
    if (!this.simulation.toppedOut) {
      this.readInput(delta);
    }

    for (let step = this.timestep.stepsFor(delta); step > 0; step -= 1) {
      this.simulation.update(FIXED_STEP);
    }

    this.drawBoard();
    this.drawPair();
    this.drawPreview();
    this.refreshChain();
    this.refreshScore();
    this.refreshGameOver();
    this.refreshFps(time);
  }

  private readInput(delta: number): void {
    // Rotation is edge-triggered — `JustDown` fires once per physical press, so
    // holding Up does not spin the piece continuously.
    if (Input.Keyboard.JustDown(this.cursors.up)) {
      this.simulation.rotate();
    }

    const newPiece = this.simulation.piecesSpawned !== this.lastPiecesSpawned;
    this.lastPiecesSpawned = this.simulation.piecesSpawned;

    this.simulation.softDropping = this.inputTranslator.update(
      {
        direction: this.pressedDirection(),
        softDropHeld: this.cursors.down.isDown,
        newPiece,
        delta,
      },
      (direction) => this.shift(direction),
    );
  }

  /**
   * Which way the player is pressing. The only genuinely Phaser-specific piece
   * of input logic, which is why it stayed in the scene: resolving both keys
   * being held needs `timeDown`, a Phaser Key property.
   */
  private pressedDirection(): HorizontalDirection | null {
    const { left, right } = this.cursors;
    // Both held: the most recently pressed wins, which is what a player means
    // when they roll from one direction into the other.
    if (left.isDown && right.isDown) {
      return left.timeDown > right.timeDown ? -1 : 1;
    }
    if (left.isDown) {
      return -1;
    }
    if (right.isDown) {
      return 1;
    }
    return null;
  }

  private shift(direction: HorizontalDirection): boolean {
    return direction === -1 ? this.simulation.moveLeft() : this.simulation.moveRight();
  }

  /**
   * Repaint all 72 cells from board state.
   *
   * Unconditionally, every frame, even though the board only changes when a
   * pair locks. That is knowingly wasteful and knowingly negligible: measured
   * at roughly 126 nanoseconds — 0.0008% of a 60fps frame. A dirty flag would
   * save nothing and add a piece of cache-invalidation state for the cascade to
   * keep correct.
   */
  private drawBoard(): void {
    for (let row = FIRST_VISIBLE_ROW; row < ROWS; row += 1) {
      for (let column = 0; column < COLUMNS; column += 1) {
        const pieceType = this.simulation.board.pieceAt(column, row);
        this.cellRectangles[(row - FIRST_VISIBLE_ROW) * COLUMNS + column].setFillStyle(
          pieceType === null ? EMPTY_COLOR : PIECE_COLORS[pieceType],
        );
      }
    }
  }

  /**
   * Draw the two halves of the falling pair on top of the board.
   *
   * These are separate rectangles from the board grid because the pair moves
   * independently of the cell layout — and later will need to move smoothly
   * between cells, which fixed-position grid cells cannot do.
   */
  private drawPair(): void {
    // In both of these states `pair` still points at the pair whose tiles are
    // already part of the board, so drawing it paints a ghost duplicate — and
    // after a top-out it would hang there at its pre-settle position forever.
    if (this.simulation.resolving || this.simulation.toppedOut) {
      for (const rectangle of this.pairRectangles) {
        rectangle.setVisible(false);
      }
      return;
    }

    const cells = this.simulation.pair.cells();
    for (let index = 0; index < cells.length; index += 1) {
      const cell = cells[index];
      const rectangle = this.pairRectangles[index];
      // A satellite spawns in the hidden row, so it is ON the board but must
      // not be drawn. Bounds and visibility stopped being the same question the
      // moment the hidden row existed.
      const showing = isVisibleRow(cell.row);

      rectangle.setVisible(showing);
      if (showing) {
        rectangle.setPosition(centerOfColumn(cell.column), centerOfRow(cell.row));
        rectangle.setFillStyle(PIECE_COLORS[cell.pieceType]);
      }
    }
  }

  /**
   * Paint the "NEXT" panel. Repainted only when the upcoming pair actually
   * changes, tracked by a string key — cheap, and it keeps the per-frame path
   * free of pointless writes.
   */
  private drawPreview(): void {
    const [pivotType, satelliteType] = this.simulation.upcoming;
    const key = `${pivotType},${satelliteType}`;
    if (key === this.shownUpcoming) {
      return;
    }

    this.shownUpcoming = key;
    // Index 0 is the lower rectangle (the pivot) and index 1 the upper (the
    // satellite), matching orientation 0 — how the pair will actually appear.
    this.previewRectangles[0].setFillStyle(PIECE_COLORS[pivotType]);
    this.previewRectangles[1].setFillStyle(PIECE_COLORS[satelliteType]);
  }

  /**
   * The "N CHAIN" callout. Shown only from the second link onward, because
   * every single clear is technically a one-link chain and announcing those
   * would make the label meaningless.
   */
  private refreshChain(): void {
    const { resolving, chainLength } = this.simulation;
    const showing = resolving && chainLength >= 2;

    this.chainText.setVisible(showing);
    if (showing && chainLength !== this.shownChain) {
      this.shownChain = chainLength;
      this.chainText.setText(`${chainLength} CHAIN`);
    }
  }

  private refreshScore(): void {
    if (this.simulation.score === this.shownScore) {
      return;
    }

    this.shownScore = this.simulation.score;
    this.scoreText.setText(`${this.shownScore}`);
  }

  /**
   * The board is left exactly as it stood, with the readout over it — losing is
   * information, and clearing the screen would throw away the shape that
   * explains why. Restarting means reloading the page for now.
   */
  private refreshGameOver(): void {
    this.gameOverText.setVisible(this.simulation.toppedOut);
  }

  private refreshFps(time: number): void {
    if (time < this.nextFpsRefresh) {
      return;
    }

    this.nextFpsRefresh = time + FPS_REFRESH_INTERVAL;
    this.fpsText.setText(`${Math.round(this.game.loop.actualFps)} fps`);
  }
}
