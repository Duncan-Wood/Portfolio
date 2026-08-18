import { Input, Scene } from 'phaser';
import { COLUMNS, PIECE_TYPE_COUNT, ROWS } from '../engine/grid';
import { Simulation } from '../engine/simulation';
import { DEFAULT_TUNING, type Tuning } from '../tuning';
import { EMPTY_COLOR, PIECE_COLORS } from '../palette';
import { FIXED_STEP, FixedTimestep } from '../fixed-timestep';
import { type HorizontalDirection, InputTranslator } from '../input/input-translator';

const CELL_SIZE = 64;
const GAP = 4;
const FPS_REFRESH_INTERVAL = 250;


const BOARD_WIDTH = COLUMNS * CELL_SIZE + (COLUMNS - 1) * GAP;
const BOARD_HEIGHT = ROWS * CELL_SIZE + (ROWS - 1) * GAP;
export const CANVAS_WIDTH = 480;
export const CANVAS_HEIGHT = 900;

const ORIGIN_X = (CANVAS_WIDTH - BOARD_WIDTH) / 2;
const ORIGIN_Y = (CANVAS_HEIGHT - BOARD_HEIGHT) / 2;

function centerOfColumn(column: number): number {
  return ORIGIN_X + column * (CELL_SIZE + GAP) + CELL_SIZE / 2;
}

function centerOfRow(row: number): number {
  return ORIGIN_Y + row * (CELL_SIZE + GAP) + CELL_SIZE / 2;
}

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
  private shownScore = -1;
  private shownChain = -1;
  private nextFpsRefresh = 0;
  private timestep: FixedTimestep;
  private inputTranslator: InputTranslator;
  private lastPiecesSpawned = 0;
  private tuning: Tuning;

  constructor() {
    super('Board');
  }

  create(): void {
    this.tuning = { ...DEFAULT_TUNING };
    this.simulation = new Simulation(randomPieceTypes, this.tuning);
    this.timestep = new FixedTimestep();
    this.inputTranslator = new InputTranslator(this.tuning);
    this.lastPiecesSpawned = this.simulation.piecesSpawned;
    this.nextFpsRefresh = 0;

    if (import.meta.env.DEV) {
      window.tuning = this.tuning;
    }

    this.cellRectangles = [];
    for (let row = 0; row < ROWS; row += 1) {
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
    this.chainText = this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, '', {
      fontFamily: 'monospace',
      fontSize: '64px',
      color: '#ffc914',
    }).setOrigin(0.5, 0.5).setVisible(false);
  }

  update(time: number, delta: number): void {
    this.readInput(delta);

    for (let step = this.timestep.stepsFor(delta); step > 0; step -= 1) {
      this.simulation.update(FIXED_STEP);
    }

    this.drawBoard();
    this.drawPair();
    this.refreshChain();
    this.refreshScore();
    this.refreshFps(time);
  }

  private readInput(delta: number): void {
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

  private pressedDirection(): HorizontalDirection | null {
    const { left, right } = this.cursors;
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

  private drawBoard(): void {
    for (let row = 0; row < ROWS; row += 1) {
      for (let column = 0; column < COLUMNS; column += 1) {
        const pieceType = this.simulation.board.pieceAt(column, row);
        this.cellRectangles[row * COLUMNS + column].setFillStyle(
          pieceType === null ? EMPTY_COLOR : PIECE_COLORS[pieceType],
        );
      }
    }
  }

  private drawPair(): void {
    if (this.simulation.resolving) {
      for (const rectangle of this.pairRectangles) {
        rectangle.setVisible(false);
      }
      return;
    }

    const cells = this.simulation.pair.cells();
    for (let index = 0; index < cells.length; index += 1) {
      const cell = cells[index];
      const rectangle = this.pairRectangles[index];
      const isOnBoard = this.simulation.board.isInside(cell.column, cell.row);

      rectangle.setVisible(isOnBoard);
      if (isOnBoard) {
        rectangle.setPosition(centerOfColumn(cell.column), centerOfRow(cell.row));
        rectangle.setFillStyle(PIECE_COLORS[cell.pieceType]);
      }
    }
  }

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

  private refreshFps(time: number): void {
    if (time < this.nextFpsRefresh) {
      return;
    }

    this.nextFpsRefresh = time + FPS_REFRESH_INTERVAL;
    this.fpsText.setText(`${Math.round(this.game.loop.actualFps)} fps`);
  }
}
