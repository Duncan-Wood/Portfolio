import { Game, Scale, WEBGL } from 'phaser';
import { BoardScene, CANVAS_HEIGHT, CANVAS_WIDTH, TOUCH_PRIMARY } from './scenes/BoardScene';
import { GROUND_COLOR } from './palette';
import { openGate } from './gate';
import { MEMORY_SIGNATURE } from './memories';
import { forgetProgressFromOlderMemories } from './progress';
import { startCrashReporting } from './crash-reporter';

const config: Phaser.Types.Core.GameConfig = {
  // Not `AUTO`, which falls back to Canvas 2D silently and slowly.
  type: WEBGL,

  // Must match the div id in `index.html`; on a mismatch Phaser appends to
  // <body> rather than erroring.
  parent: 'game-container',

  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,

  backgroundColor: GROUND_COLOR,

  scale: {
    mode: Scale.FIT,
    autoCenter: TOUCH_PRIMARY ? Scale.CENTER_HORIZONTALLY : Scale.CENTER_BOTH,
  },

  scene: [BoardScene],
};

startCrashReporting();
forgetProgressFromOlderMemories(MEMORY_SIGNATURE);

void openGate(import.meta.env.VITE_GAME_CODE).then(() => {
  const game = new Game(config);

  game.events.once('ready', () => {
    game.canvas.setAttribute('role', 'img');
    game.canvas.setAttribute(
      'aria-label',
      'Connected: a falling-block game played on a grid. A screen reader cannot read the '
      + 'board or the memories it unlocks. The link to the standard version of the site is '
      + 'plain text.',
    );
  });
});
