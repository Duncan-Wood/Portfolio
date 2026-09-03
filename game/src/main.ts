import { Game, Scale, WEBGL } from 'phaser';
import { BoardScene, CANVAS_HEIGHT, CANVAS_WIDTH } from './scenes/BoardScene';
import { GROUND_COLOR } from './palette';

const config: Phaser.Types.Core.GameConfig = {
  /** Not `AUTO`, which falls back to Canvas 2D silently and slowly. */
  type: WEBGL,

  /**
   * Must match the div id in `index.html`. On a mismatch Phaser appends to
   * <body> rather than erroring, and the container's sizing CSS is ignored.
   */
  parent: 'game-container',

  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,

  backgroundColor: GROUND_COLOR,

  scale: {
    // Letterboxed at a fixed aspect ratio, so the picture is scaled and never
    // reflowed. There is no responsive layout anywhere in the game.
    mode: Scale.FIT,
    autoCenter: Scale.CENTER_BOTH,
  },

  scene: [BoardScene],
};

new Game(config);
