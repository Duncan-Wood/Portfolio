import { Scene } from 'phaser';
import { COLUMNS, ROWS, pieceTypeAt } from '../engine/grid';

const CELL_SIZE = 64;
const GAP = 4;
const FPS_REFRESH_INTERVAL = 250;

const PIECE_COLORS = [0xe4572e, 0x17bebb, 0xffc914, 0x76b041, 0x8a4fff, 0xef476f];

const BOARD_WIDTH = COLUMNS * CELL_SIZE + (COLUMNS - 1) * GAP;
const BOARD_HEIGHT = ROWS * CELL_SIZE + (ROWS - 1) * GAP;
export const CANVAS_WIDTH = 480;
export const CANVAS_HEIGHT = 900;

export class BoardScene extends Scene {
  private fpsText: Phaser.GameObjects.Text;
  private nextFpsRefresh = 0;

  constructor() {
    super('Board');
  }

  create(): void {
    const originX = (CANVAS_WIDTH - BOARD_WIDTH) / 2;
    const originY = (CANVAS_HEIGHT - BOARD_HEIGHT) / 2;

    for (let column = 0; column < COLUMNS; column += 1) {
      for (let row = 0; row < ROWS; row += 1) {
        this.add.rectangle(
          originX + column * (CELL_SIZE + GAP) + CELL_SIZE / 2,
          originY + row * (CELL_SIZE + GAP) + CELL_SIZE / 2,
          CELL_SIZE,
          CELL_SIZE,
          PIECE_COLORS[pieceTypeAt(column, row)],
        );
      }
    }

    this.fpsText = this.add.text(8, 8, '', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#8ea3b0',
    });
  }

  update(time: number): void {
    if (time < this.nextFpsRefresh) {
      return;
    }

    this.nextFpsRefresh = time + FPS_REFRESH_INTERVAL;
    this.fpsText.setText(`${Math.round(this.game.loop.actualFps)} fps`);
  }
}
