import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    const { WIDTH, HEIGHT } = GAME_CONFIG;

    this.add.rectangle(0, 0, WIDTH, HEIGHT, GAME_CONFIG.COLOR_BG).setOrigin(0);
    this.createStars();

    this.add.triangle(
      WIDTH / 2, HEIGHT / 2 - 80,
      0, -30, -20, 20, 20, 20,
      GAME_CONFIG.COLOR_SHIP
    );

    this.add.text(WIDTH / 2, HEIGHT / 2 - 10, 'CLIMBING SPACESHIP', {
      fontSize: '22px',
      color: '#00e5ff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const startText = this.add.text(WIDTH / 2, HEIGHT / 2 + 80, '[ PRESS SPACE TO START ]', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: startText,
      alpha: 0,
      duration: 700,
      yoyo: true,
      repeat: -1,
    });

    this.input.keyboard!.once('keydown-SPACE', () => {
      this.scene.start('GameScene');
    });
  }

  private createStars(): void {
    const { WIDTH, HEIGHT } = GAME_CONFIG;
    for (let i = 0; i < 80; i++) {
      const x = Phaser.Math.Between(0, WIDTH);
      const y = Phaser.Math.Between(0, HEIGHT);
      const size = Math.random() < 0.2 ? 2 : 1;
      this.add.rectangle(x, y, size, size, GAME_CONFIG.COLOR_STAR, Math.random() * 0.8 + 0.2);
    }
  }
}
