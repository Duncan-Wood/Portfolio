import { Game, Scale, WEBGL } from 'phaser';
import { BoardScene, CANVAS_HEIGHT, CANVAS_WIDTH } from './scenes/BoardScene';

const config: Phaser.Types.Core.GameConfig = {
  type: WEBGL,
  parent: 'game-container',
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
  backgroundColor: '#12161a',
  scale: {
    mode: Scale.FIT,
    autoCenter: Scale.CENTER_BOTH,
  },
  scene: [BoardScene],
};

new Game(config);
