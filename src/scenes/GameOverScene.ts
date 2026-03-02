import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig';

interface GameOverData {
  altitude: number;
}

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  create(data: GameOverData): void {
    const { WIDTH, HEIGHT } = GAME_CONFIG;

    this.add.rectangle(0, 0, WIDTH, HEIGHT, GAME_CONFIG.COLOR_BG, 0.92).setOrigin(0);

    this.add.text(WIDTH / 2, HEIGHT / 2 - 80, 'GAME OVER', {
      fontSize: '32px',
      color: '#ff4444',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(WIDTH / 2, HEIGHT / 2 - 20, `MAX ALTITUDE: ${data.altitude}m`, {
      fontSize: '20px',
      color: '#00e5ff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    const retryText = this.add.text(WIDTH / 2, HEIGHT / 2 + 60, '[ SPACE ] RETRY', {
      fontSize: '15px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: retryText,
      alpha: 0,
      duration: 600,
      yoyo: true,
      repeat: -1,
    });

    this.add.text(WIDTH / 2, HEIGHT / 2 + 100, '[ M ] MENU', {
      fontSize: '13px',
      color: '#888888',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.input.keyboard!.once('keydown-SPACE', () => {
      this.scene.start('GameScene');
    });

    this.input.keyboard!.once('keydown-M', () => {
      this.scene.start('MenuScene');
    });
  }
}
