import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig';

export class Platform extends Phaser.Physics.Arcade.StaticGroup {
  static create(scene: Phaser.Scene, x: number, y: number): Phaser.Physics.Arcade.Image {
    const img = scene.physics.add.staticImage(x, y, '__platform');
    return img;
  }

  static preloadTexture(scene: Phaser.Scene): void {
    const g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(GAME_CONFIG.COLOR_PLATFORM);
    g.fillRect(0, 0, GAME_CONFIG.PLATFORM_WIDTH, GAME_CONFIG.PLATFORM_HEIGHT);
    g.generateTexture('__platform', GAME_CONFIG.PLATFORM_WIDTH, GAME_CONFIG.PLATFORM_HEIGHT);
    g.destroy();

    const g2 = scene.make.graphics({ x: 0, y: 0 });
    g2.fillStyle(GAME_CONFIG.COLOR_PLATFORM_RECHARGING);
    g2.fillRect(0, 0, GAME_CONFIG.PLATFORM_WIDTH, GAME_CONFIG.PLATFORM_HEIGHT);
    g2.generateTexture('__platform_recharging', GAME_CONFIG.PLATFORM_WIDTH, GAME_CONFIG.PLATFORM_HEIGHT);
    g2.destroy();
  }
}
