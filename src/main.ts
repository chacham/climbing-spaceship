import Phaser from 'phaser';
import { GAME_CONFIG } from './config/gameConfig';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { GameOverScene } from './scenes/GameOverScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_CONFIG.WIDTH,
  height: GAME_CONFIG.HEIGHT,
  backgroundColor: GAME_CONFIG.COLOR_BG,
  parent: 'game-container',
  scene: [BootScene, MenuScene, GameScene, GameOverScene],
  physics: {
    default: 'matter',
    matter: {
      debug: false,
      gravity: { x: 0, y: GAME_CONFIG.GRAVITY / 100 },
      positionIterations: 20,
      velocityIterations: 20,
      constraintIterations: 4,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

new Phaser.Game(config);
