import Phaser from 'phaser';

export type ObstacleType = 'triangle' | 'rectangle' | 'pentagon';

export class Obstacle {
  static create(
    scene: Phaser.Scene,
    x: number,
    y: number,
    type: ObstacleType
  ): Phaser.Physics.Matter.Image {
    const config = OBSTACLE_CONFIGS[type];
    
    const img = scene.matter.add.image(x, y, `__obstacle_${type}`, undefined, {
      isStatic: true,
      label: 'obstacle',
      friction: 0.3,
      restitution: 0.6,
      slop: 0,
      collisionFilter: {
        category: 0x0002,
        mask: 0x0001,
      },
    } as Phaser.Types.Physics.Matter.MatterBodyConfig);
    
    img.setBody({
      type: 'polygon',
      sides: config.sides,
      radius: config.radius,
    });
    
    img.setAngle(Phaser.Math.Between(0, 360));
    img.setTint(config.color);
    
    return img;
  }

  static preloadTextures(scene: Phaser.Scene): void {
    Object.entries(OBSTACLE_CONFIGS).forEach(([type, config]) => {
      const g = scene.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0xffffff);
      
      const radius = config.radius;
      const sides = config.sides;
      const points: { x: number; y: number }[] = [];
      
      for (let i = 0; i < sides; i++) {
        const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
        points.push({
          x: radius + Math.cos(angle) * radius * 0.9,
          y: radius + Math.sin(angle) * radius * 0.9,
        });
      }
      
      g.beginPath();
      g.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        g.lineTo(points[i].x, points[i].y);
      }
      g.closePath();
      g.fillPath();
      
      g.generateTexture(`__obstacle_${type}`, radius * 2, radius * 2);
      g.destroy();
    });
  }
}

const OBSTACLE_CONFIGS: Record<ObstacleType, { sides: number; radius: number; color: number }> = {
  triangle: { sides: 3, radius: 25, color: 0xff6644 },
  rectangle: { sides: 4, radius: 30, color: 0xffaa44 },
  pentagon: { sides: 5, radius: 28, color: 0xff44aa },
};
