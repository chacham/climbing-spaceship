import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig';

export class Platform {
  static create(scene: Phaser.Scene, x: number, y: number, isFullWidth = false): Phaser.Physics.Matter.Image {
    const textureKey = isFullWidth ? '__platform_full' : '__platform';
    
    const img = scene.matter.add.image(x, y, textureKey, undefined, {
      isStatic: true,
      label: 'platform',
      friction: 0.8,
      restitution: 0.2,
      slop: 0,
      collisionFilter: {
        category: 0x0004,
        mask: 0x0001,
      },
    } as Phaser.Types.Physics.Matter.MatterBodyConfig);
    
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

    const gFull = scene.make.graphics({ x: 0, y: 0 });
    gFull.fillStyle(GAME_CONFIG.COLOR_PLATFORM);
    gFull.fillRect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.PLATFORM_HEIGHT);
    gFull.generateTexture('__platform_full', GAME_CONFIG.WIDTH, GAME_CONFIG.PLATFORM_HEIGHT);
    gFull.destroy();
  }
}
