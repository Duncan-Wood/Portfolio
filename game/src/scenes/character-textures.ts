import { CHARACTER_SHEET, type CharacterAnimation } from '../character';
import { CHAIN_COLOR, PURSE_ART, PURSE_AT, PURSE_PALETTE, chainBetween } from '../character-purse';

export const CHARACTER_PIXEL = 3;

const PIXEL = CHARACTER_PIXEL;

export const CHARACTER_FRAME_WIDTH = 48 * PIXEL;

export const CHARACTER_FRAME_HEIGHT = 64 * PIXEL;

export const THOUGHT_WIDTH = 16 * PIXEL;

export const THOUGHT_HEIGHT = 13 * PIXEL;

const HAT = 0x6b4a2b;
const SKIN = 0xd9b38c;
const SHIRT = 0x3b6ea8;
const TROUSERS = 0x3a3a48;
const BOOT = 0x2a2a35;
const PAPER = 0xe8eef2;
const INK = 0x3b3b4a;
const MARKER = 0x8a4fff;

type Arms = 'down' | 'up' | 'hugging';

interface Pose {
  dx: number;
  dy: number;
  arms: Arms;
}

const still = (dx: number, dy: number, arms: Arms = 'down'): Pose => ({ dx, dy, arms });

type DrawBlock = (color: number, left: number, top: number, width: number, height: number) => void;

const STAND_IN_POSES: Partial<Record<CharacterAnimation, readonly Pose[]>> = {
  idle: [still(0, 0), still(0, 1), still(0, 1), still(0, 0)],
  cheer: [still(0, 0, 'up'), still(0, -3, 'up'), still(0, -1, 'up')],
  worried: [still(1, 2, 'hugging'), still(2, 2, 'hugging'), still(1, 2, 'hugging')],
  lost: [still(0, 1), still(0, 2), still(0, 4)],
  won: [still(0, -2, 'up'), still(0, -4, 'up'), still(0, -2, 'up')],
};

export const THOUGHT_FRAMES = 3;

export function thoughtTexture(frame: number): string {
  return `character-thought-${frame}`;
}

export function characterTexture(animation: CharacterAnimation, frame: number): string {
  return `character-${animation}-${frame}`;
}

export function bakeCharacterStandIn(scene: Phaser.Scene): void {
  const graphics = scene.add.graphics();

  for (const animation of Object.keys(CHARACTER_SHEET) as CharacterAnimation[]) {
    const poses = STAND_IN_POSES[animation];
    const { frames } = CHARACTER_SHEET[animation];
    if (poses !== undefined && poses.length !== frames) {
      throw new Error(
        `The stand-in draws ${poses.length} ${animation} frames but CHARACTER_SHEET expects ${frames}.`,
      );
    }

    for (let frame = 0; frame < frames; frame += 1) {
      graphics.clear();
      const pose = poses?.[frame];
      if (pose !== undefined) {
        drawStandIn(graphics, pose);
      } else {
        drawScreenPose(graphics, animation, frame);
      }
      graphics.generateTexture(characterTexture(animation, frame), CHARACTER_FRAME_WIDTH, CHARACTER_FRAME_HEIGHT);
    }
  }

  bakeThoughtBubble(graphics);

  graphics.destroy();
}

function bakeThoughtBubble(graphics: Phaser.GameObjects.Graphics): void {
  const dotColumns = [4, 7, 10];

  for (let frame = 0; frame < THOUGHT_FRAMES; frame += 1) {
    graphics.clear();
    const block = blockOn(graphics);

    block(PAPER, 3, 0, 10, 1);
    block(PAPER, 1, 1, 14, 7);
    block(PAPER, 3, 8, 10, 1);
    block(PAPER, 5, 10, 2, 2);
    block(PAPER, 3, 12, 1, 1);
    dotColumns.slice(0, frame + 1).forEach((column) => block(INK, column, 3, 2, 2));
    graphics.generateTexture(thoughtTexture(frame), THOUGHT_WIDTH, THOUGHT_HEIGHT);
  }
}

function blockOn(graphics: Phaser.GameObjects.Graphics, dx = 0, dy = 0): DrawBlock {
  return (color, left, top, width, height) => {
    graphics.fillStyle(color, 1);
    graphics.fillRect((left + dx) * PIXEL, (top + dy) * PIXEL, width * PIXEL, height * PIXEL);
  };
}

const STRAP_FROM = { x: 18, y: 27 };
const STRAP_TO = { x: 31, y: 37 };
const PURSE_ON_FLOOR = { x: 37, y: 52 };

function drawPurse(block: DrawBlock, left: number, top: number): void {
  PURSE_ART.forEach((row, y) => {
    [...row].forEach((pixel, x) => {
      if (pixel !== '.') {
        block(PURSE_PALETTE[pixel], left + x, top + y, 1, 1);
      }
    });
  });
}

function drawWornPurse(block: DrawBlock): void {
  chainBetween(STRAP_FROM, STRAP_TO).forEach(({ x, y }) => block(CHAIN_COLOR, x, y, 1, 1));
  drawPurse(block, PURSE_AT.x, PURSE_AT.y);
}

function drawHead(block: DrawBlock, dx: number, dy: number): void {
  block(SKIN, 18 + dx, 13 + dy, 12, 13);
  block(HAT, 18 + dx, 5 + dy, 12, 7);
  block(HAT, 11 + dx, 11 + dy, 26, 3);
}

function drawScreenPose(graphics: Phaser.GameObjects.Graphics, animation: CharacterAnimation, frame: number): void {
  if (animation === 'thinking') {
    drawThinking(graphics, frame);
  } else if (animation === 'reading') {
    drawReading(graphics, frame);
  } else if (animation === 'sitting') {
    drawSitting(graphics, frame);
  } else if (animation === 'musing' || animation === 'lowering') {
    drawMusing(graphics, animation === 'musing' ? frame : 1 - frame);
  } else if (animation === 'drawing' || animation === 'stowing') {
    drawDrawing(graphics, animation === 'drawing' ? frame : 1 - frame);
  } else if (animation === 'settling' || animation === 'rising') {
    drawSettling(graphics, animation === 'settling' ? frame : 1 - frame);
  } else {
    throw new Error(`No drawing for the ${animation} animation.`);
  }
}

function drawMusing(graphics: Phaser.GameObjects.Graphics, frame: number): void {
  const body = blockOn(graphics);

  body(TROUSERS, 19, 44, 4, 16);
  body(TROUSERS, 25, 44, 4, 16);
  body(SHIRT, 17, 26, 14, 18);
  drawWornPurse(body);
  if (frame === 0) {
    body(SHIRT, 13, 27, 3, 5);
    body(SKIN, 13, 32, 3, 9);
    body(SHIRT, 32, 27, 3, 5);
    body(SKIN, 32, 32, 3, 4);
    body(SKIN, 28, 32, 5, 3);
  } else {
    body(SHIRT, 13, 27, 3, 8);
    body(SKIN, 13, 34, 17, 3);
    body(SHIRT, 32, 27, 3, 8);
    body(SKIN, 28, 34, 7, 3);
    body(SKIN, 27, 30, 4, 5);
  }
  drawHead(body, frame, 0);
}

function drawDrawing(graphics: Phaser.GameObjects.Graphics, frame: number): void {
  const body = blockOn(graphics);

  body(TROUSERS, 19, 44, 4, 16);
  body(TROUSERS, 25, 44, 4, 16);
  body(SHIRT, 17, 26, 14, 18);
  drawWornPurse(body);
  if (frame === 0) {
    body(SHIRT, 13, 27, 3, 5);
    body(SKIN, 13, 32, 3, 9);
    body(SHIRT, 32, 27, 3, 7);
    body(SKIN, 29, 34, 6, 3);
  } else {
    body(SHIRT, 13, 27, 3, 7);
    body(SHIRT, 32, 27, 3, 7);
    body(PAPER, 17, 33, 14, 8);
    body(INK, 17, 33, 14, 1);
    body(INK, 19, 36, 10, 1);
    body(SKIN, 13, 34, 4, 4);
    body(SKIN, 31, 34, 4, 4);
  }
  drawHead(body, 0, 1);
}

const SETTLING_SHIFT = [4, 9];

function drawSettling(graphics: Phaser.GameObjects.Graphics, frame: number): void {
  const shift = SETTLING_SHIFT[frame];
  const floor = blockOn(graphics);
  const upper = blockOn(graphics, 0, shift);

  if (frame === 0) {
    floor(TROUSERS, 19, 48, 4, 12);
    floor(TROUSERS, 25, 48, 4, 12);
    upper(SHIRT, 17, 26, 14, 18);
    drawWornPurse(upper);
    upper(SHIRT, 13, 27, 3, 5);
    upper(SKIN, 13, 32, 3, 9);
    upper(SHIRT, 32, 27, 3, 5);
    upper(SKIN, 32, 32, 3, 9);
  } else {
    floor(TROUSERS, 13, 54, 22, 6);
    floor(TROUSERS, 12, 51, 5, 5);
    floor(TROUSERS, 31, 51, 5, 5);
    floor(BOOT, 19, 58, 4, 3);
    floor(BOOT, 25, 58, 4, 3);
    drawPurse(floor, PURSE_ON_FLOOR.x, PURSE_ON_FLOOR.y);
    upper(SHIRT, 17, 26, 14, 14);
    upper(SHIRT, 13, 27, 3, 5);
    upper(SKIN, 13, 32, 3, 6);
    upper(SHIRT, 32, 27, 3, 5);
    upper(SKIN, 32, 32, 3, 6);
  }
  drawHead(floor, 0, shift);
}

const THINKING_HEAD_DX = [0, 1, 2, 1];
const THINKING_BOB = [0, 0, 1, 0];
const THINKING_FIST_RISE = [0, 0, 1, 0];

function drawThinking(graphics: Phaser.GameObjects.Graphics, frame: number): void {
  const body = blockOn(graphics, 0, THINKING_BOB[frame]);
  const fist = blockOn(graphics, 0, THINKING_BOB[frame] - THINKING_FIST_RISE[frame]);
  const head = blockOn(graphics, 0, 0);

  body(TROUSERS, 19, 44, 4, 16);
  body(TROUSERS, 25, 44, 4, 16);
  body(SHIRT, 17, 26, 14, 18);
  drawWornPurse(body);
  body(SHIRT, 13, 27, 3, 8);
  body(SKIN, 13, 34, 17, 3);
  body(SHIRT, 32, 27, 3, 8);
  body(SKIN, 28, 34, 7, 3);
  drawHead(head, THINKING_HEAD_DX[frame], THINKING_BOB[frame]);
  fist(SKIN, 27, 29, 4, 6);
  fist(SKIN, 26, 24, 6, 6);
}

const READING_HEAD_DY = [1, 1, 2, 1];
const READING_MARKER_ROW = [32, 34, 36, 38];
const READING_LINE_WIDTHS = [12, 9, 12, 7];

function drawReading(graphics: Phaser.GameObjects.Graphics, frame: number): void {
  const body = blockOn(graphics);
  const head = blockOn(graphics);

  body(TROUSERS, 19, 44, 4, 16);
  body(TROUSERS, 25, 44, 4, 16);
  body(SHIRT, 17, 26, 14, 18);
  drawWornPurse(body);
  body(SHIRT, 13, 27, 3, 7);
  body(SHIRT, 32, 27, 3, 7);
  body(PAPER, 16, 30, 16, 12);
  body(INK, 16, 30, 16, 1);
  READING_LINE_WIDTHS.forEach((width, line) => {
    body(line === frame ? MARKER : INK, 18, READING_MARKER_ROW[line], width, 1);
  });
  body(SKIN, 13, 34, 3, 4);
  body(SKIN, 32, 34, 3, 4);
  body(SKIN, 15, 37, 3, 3);
  body(SKIN, 30, 37, 3, 3);
  drawHead(head, 0, READING_HEAD_DY[frame]);
}

const SITTING_SHIFT = 14;
const SITTING_BREATH = [0, 0, 1, 0];
const SITTING_GLANCE = [0, -1, 0, 1];

function drawSitting(graphics: Phaser.GameObjects.Graphics, frame: number): void {
  const floor = blockOn(graphics);
  const upper = blockOn(graphics, 0, SITTING_SHIFT + SITTING_BREATH[frame]);
  const head = blockOn(graphics, 0, 0);

  floor(TROUSERS, 13, 54, 22, 6);
  floor(TROUSERS, 12, 51, 5, 5);
  floor(TROUSERS, 31, 51, 5, 5);
  floor(BOOT, 19, 58, 4, 3);
  floor(BOOT, 25, 58, 4, 3);
  drawPurse(floor, PURSE_ON_FLOOR.x, PURSE_ON_FLOOR.y);
  upper(SHIRT, 17, 26, 14, 14);
  upper(SHIRT, 13, 27, 3, 6);
  upper(SHIRT, 32, 27, 3, 6);
  upper(SKIN, 13, 33, 3, 4);
  upper(SKIN, 32, 33, 3, 4);
  upper(SKIN, 12, 36, 5, 3);
  upper(SKIN, 31, 36, 5, 3);
  drawHead(head, SITTING_GLANCE[frame], SITTING_SHIFT + SITTING_BREATH[frame]);
}

function drawStandIn(graphics: Phaser.GameObjects.Graphics, { dx, dy, arms }: Pose): void {
  const block = (color: number, left: number, top: number, width: number, height: number): void => {
    graphics.fillStyle(color, 1);
    graphics.fillRect((left + dx) * PIXEL, (top + dy) * PIXEL, width * PIXEL, height * PIXEL);
  };

  block(TROUSERS, 19, 44, 4, 16);
  block(TROUSERS, 25, 44, 4, 16);
  block(SHIRT, 17, 26, 14, 18);
  drawWornPurse(block);
  if (arms === 'up') {
    block(SKIN, 13, 13, 3, 9);
    block(SKIN, 32, 13, 3, 9);
    block(SHIRT, 13, 22, 3, 5);
    block(SHIRT, 32, 22, 3, 5);
  } else {
    block(SHIRT, 13, 27, 3, 5);
    block(SHIRT, 32, 27, 3, 5);
    if (arms === 'hugging') {
      block(SKIN, 16, 31, 5, 3);
      block(SKIN, 27, 31, 5, 3);
    } else {
      block(SKIN, 13, 32, 3, 9);
      block(SKIN, 32, 32, 3, 9);
    }
  }
  block(SKIN, 18, 13, 12, 13);
  block(HAT, 18, 5, 12, 7);
  block(HAT, 11, 11, 26, 3);
}
