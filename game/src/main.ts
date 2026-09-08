import { Game, Scale, WEBGL } from 'phaser';
import { BoardScene, CANVAS_HEIGHT, CANVAS_WIDTH } from './scenes/BoardScene';
import { GROUND_COLOR } from './palette';
import { openGate } from './gate';
import { forgetProgressFromAnOlderBuild } from './progress';
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
    autoCenter: Scale.CENTER_BOTH,
  },

  scene: [BoardScene],
};

startCrashReporting();
forgetProgressFromAnOlderBuild();

void openGate(import.meta.env.VITE_GAME_CODE).then(() => new Game(config));
