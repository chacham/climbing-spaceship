import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    this.createLoadingBar();
  }

  create(): void {
    this.scene.start('MenuScene');
  }

  private createLoadingBar(): void {
    const { WIDTH, HEIGHT } = GAME_CONFIG;
    const bar = this.add.graphics();

    this.load.on('progress', (value: number) => {
      bar.clear();
      bar.fillStyle(0x222244);
      bar.fillRect(WIDTH / 4, HEIGHT / 2 - 20, WIDTH / 2, 30);
      bar.fillStyle(GAME_CONFIG.COLOR_SHIP);
      bar.fillRect(WIDTH / 4, HEIGHT / 2 - 20, (WIDTH / 2) * value, 30);
    });

    this.load.on('complete', () => {
      bar.destroy();
    });
  }
}
