import { Game, Scale, WEBGL } from 'phaser';
import { BoardScene, CANVAS_HEIGHT, CANVAS_WIDTH } from './scenes/BoardScene';
import { GROUND_COLOR } from './palette';

/*
 * Entry point. Vite loads this from `index.html`; it builds the Phaser game and
 * starts it. Everything else in the app hangs off this one object.
 */
const config: Phaser.Types.Core.GameConfig = {
  /**
   * Force the WebGL renderer rather than `Phaser.AUTO`, which would fall back
   * to Canvas 2D silently. WebGL batches many shapes into few GPU draw calls;
   * Canvas issues CPU work per shape. Irrelevant at this scale, but the
   * juice pass will add particles, and a silent fallback would be a confusing
   * performance cliff to debug later.
   */
  type: WEBGL,

  /**
   * Must match the div id in `index.html`. If it does not, Phaser silently
   * appends the canvas to <body> rather than erroring, so the game still runs
   * but ignores the container's sizing CSS.
   */
  parent: 'game-container',

  /**
   * The game's coordinate space, fixed regardless of window size. All positions
   * in the scene are written in these units and never need to be responsive.
   */
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,

  backgroundColor: GROUND_COLOR,

  scale: {
    /**
     * FIT scales the canvas to fill the window while preserving its aspect
     * ratio, leaving empty bars where the window's shape differs — letterboxing,
     * as with a widescreen film on a squarer screen. Combined with the fixed
     * width/height above, this is what removes responsive layout from the game
     * entirely: the picture is scaled, never reflowed.
     */
    mode: Scale.FIT,
    autoCenter: Scale.CENTER_BOTH,
  },

  /**
   * One scene. Memories surface inside the board rather than cutting away to
   * their own screen — see `revealNextNode` for why.
   */
  scene: [BoardScene],
};

new Game(config);
