import { Game, Scale, WEBGL } from 'phaser';
import { BoardScene, CANVAS_HEIGHT, CANVAS_WIDTH } from './scenes/BoardScene';
import { GROUND_COLOR } from './palette';
import { openGate } from './gate';
import { MEMORY_SIGNATURE } from './memories';
import { forgetProgressFromOlderMemories } from './progress';
import { startCrashReporting } from './crash-reporter';
import { showControlScheme, wireControlScheme, wireTouchButtons } from './touch-buttons';

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
    autoCenter: Scale.CENTER_BOTH,
  },

  scene: [BoardScene],
};

showControlScheme();
startCrashReporting();
forgetProgressFromOlderMemories(MEMORY_SIGNATURE);

void openGate(import.meta.env.VITE_GAME_CODE).then(() => {
  const game = new Game(config);
  game.events.once('ready', () => {
    const board = game.scene.getScene('Board') as BoardScene;
    wireTouchButtons(board.touch);
    wireControlScheme((scheme) => board.useControlScheme(scheme));
  });
});
