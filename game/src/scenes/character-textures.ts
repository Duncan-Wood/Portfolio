import { CHARACTER_SHEET, type CharacterAnimation } from '../character';

const PIXEL = 3;

export const CHARACTER_FRAME_WIDTH = 48 * PIXEL;

export const CHARACTER_FRAME_HEIGHT = 64 * PIXEL;

const HAT = 0x6b4a2b;
const SKIN = 0xd9b38c;
const SHIRT = 0x3b6ea8;
const TROUSERS = 0x3a3a48;

type Arms = 'down' | 'up' | 'hugging';

interface Pose {
  dx: number;
  dy: number;
  arms: Arms;
}

const still = (dx: number, dy: number, arms: Arms = 'down'): Pose => ({ dx, dy, arms });

const STAND_IN_POSES: Record<CharacterAnimation, readonly Pose[]> = {
  idle: [still(0, 0), still(0, 1), still(0, 1), still(0, 0)],
  cheer: [still(0, 0, 'up'), still(0, -3, 'up'), still(0, -1, 'up')],
  worried: [still(1, 2, 'hugging'), still(2, 2, 'hugging'), still(1, 2, 'hugging')],
  lost: [still(0, 1), still(0, 2), still(0, 4)],
  won: [still(0, -2, 'up'), still(0, -4, 'up'), still(0, -2, 'up')],
};

export function characterTexture(animation: CharacterAnimation, frame: number): string {
  return `character-${animation}-${frame}`;
}

export function bakeCharacterStandIn(scene: Phaser.Scene): void {
  const graphics = scene.add.graphics();

  for (const animation of Object.keys(CHARACTER_SHEET) as CharacterAnimation[]) {
    const poses = STAND_IN_POSES[animation];
    if (poses.length !== CHARACTER_SHEET[animation].frames) {
      throw new Error(
        `The stand-in draws ${poses.length} ${animation} frames but CHARACTER_SHEET expects ${CHARACTER_SHEET[animation].frames}.`,
      );
    }

    poses.forEach((pose, frame) => {
      graphics.clear();
      drawStandIn(graphics, pose);
      graphics.generateTexture(characterTexture(animation, frame), CHARACTER_FRAME_WIDTH, CHARACTER_FRAME_HEIGHT);
    });
  }

  graphics.destroy();
}

function drawStandIn(graphics: Phaser.GameObjects.Graphics, { dx, dy, arms }: Pose): void {
  const block = (color: number, left: number, top: number, width: number, height: number): void => {
    graphics.fillStyle(color, 1);
    graphics.fillRect((left + dx) * PIXEL, (top + dy) * PIXEL, width * PIXEL, height * PIXEL);
  };

  block(TROUSERS, 19, 44, 4, 16);
  block(TROUSERS, 25, 44, 4, 16);
  block(SHIRT, 17, 26, 14, 18);
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
