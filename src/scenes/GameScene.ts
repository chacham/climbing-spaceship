import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig';
import { Spaceship, ThrusterState } from '../objects/Spaceship';
import { Platform } from '../objects/Platform';
import { Obstacle, ObstacleType } from '../objects/Obstacle';

export class GameScene extends Phaser.Scene {
  private ship!: Spaceship;
  private platforms: Phaser.Physics.Matter.Image[] = [];
  private obstacles: Phaser.Physics.Matter.Image[] = [];
  private keyLeft!: Phaser.Input.Keyboard.Key;
  private keyRight!: Phaser.Input.Keyboard.Key;
  private keyUp!: Phaser.Input.Keyboard.Key;
  private keyDown!: Phaser.Input.Keyboard.Key;
  private keyEsc!: Phaser.Input.Keyboard.Key;

  private hudAltitude!: Phaser.GameObjects.Text;
  private hudSpeed!: Phaser.GameObjects.Text;
  private fuelBarFill!: Phaser.GameObjects.Rectangle;
  private controlIndicators!: { left: Phaser.GameObjects.Text; right: Phaser.GameObjects.Text; up: Phaser.GameObjects.Text; down: Phaser.GameObjects.Text };

  // Dev mode debug info
  private debugInfo!: Phaser.GameObjects.Text;
  private prevFuel: number = GAME_CONFIG.FUEL_MAX;

  private maxAltitude = 0;
  private worldOriginY = 0;
  private isGameOver = false;

  private get isDev(): boolean {
    return typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV === true;
  }

  constructor() {
    super({ key: 'GameScene' });
  }

  preload(): void {
    Spaceship.preloadTexture(this);
    Platform.preloadTexture(this);
    Obstacle.preloadTextures(this);
  }

  create(): void {
    const { WIDTH, HEIGHT } = GAME_CONFIG;

    this.maxAltitude = 0;
    this.isGameOver = false;
    this.worldOriginY = HEIGHT - 80;
    this.platforms = [];
    this.obstacles = [];

    this.matter.world.setBounds(-50, -Number.MAX_SAFE_INTEGER / 2, WIDTH + 100, Number.MAX_SAFE_INTEGER);

    this.cameras.main.setBackgroundColor(GAME_CONFIG.COLOR_BG);
    this.cameras.main.setBounds(0, -Number.MAX_SAFE_INTEGER / 2, WIDTH, Number.MAX_SAFE_INTEGER);

    this.createStarfield();

    this.spawnInitialPlatforms();

    this.ship = new Spaceship(this, GAME_CONFIG.SHIP_START_X, GAME_CONFIG.SHIP_START_Y);
    this.cameras.main.startFollow(this.ship, true, 0.08, 0.08);
    this.cameras.main.setFollowOffset(0, HEIGHT * 0.25);

    this.matter.world.on('collisionstart', (event: Phaser.Physics.Matter.Events.CollisionStartEvent) => {
      event.pairs.forEach((pair) => {
        const bodyA = pair.bodyA;
        const bodyB = pair.bodyB;
        
        const isPlatformA = bodyA.label === 'platform';
        const isPlatformB = bodyB.label === 'platform';
        
        if (isPlatformA || isPlatformB) {
          console.log('[LAND] Ship collided with platform');
          this.ship.land();
          const platformBody = isPlatformA ? bodyA : bodyB;
          const platformImg = this.platforms.find(p => p.body === platformBody);
          platformImg?.setData('visited', true);
        }
      });
    });

    this.matter.world.on('collisionend', (event: Phaser.Physics.Matter.Events.CollisionEndEvent) => {
      event.pairs.forEach((pair) => {
        const bodyA = pair.bodyA;
        const bodyB = pair.bodyB;
        
        const isPlatformA = bodyA.label === 'platform';
        const isPlatformB = bodyB.label === 'platform';
        
        if (isPlatformA || isPlatformB) {
          console.log('[LIFTOFF] Ship left platform');
          this.ship.liftOff();
        }
      });
    });

    this.keyLeft = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    this.keyRight = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    this.keyUp = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.keyDown = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    this.keyEsc = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    this.keyEsc.on('down', () => {
      this.scene.start('MenuScene');
    });

    this.createHUD();
  }

  update(_time: number, delta: number): void {
    if (this.isGameOver) return;

    const thrusters: ThrusterState = {
      left: this.keyLeft.isDown,
      right: this.keyRight.isDown,
      up: this.keyUp.isDown,
      down: this.keyDown.isDown,
    };

    const altitude = this.computeAltitude();
    const altitudeScale = this.computeAltitudeScale(altitude);

    this.ship.setAltitude(altitude);
    this.ship.applyThrusters(thrusters, altitudeScale, delta);

    if (altitude > this.maxAltitude) this.maxAltitude = altitude;

    this.wrapShipHorizontal();
    this.recyclePlatforms();
    this.updateHUD(thrusters, altitude);

    if (this.ship.y > this.worldOriginY + 200) {
      this.triggerGameOver();
    }
  }

  private computeAltitude(): number {
    return Math.max(0, Math.round((this.worldOriginY - this.ship.y) / 10));
  }

  private computeAltitudeScale(altitude: number): number {
    return 1 + altitude / GAME_CONFIG.ALTITUDE_GRAVITY_SCALE_HEIGHT;
  }

  private createStarfield(): void {
    const { WIDTH, HEIGHT } = GAME_CONFIG;
    for (let layer = 0; layer < 3; layer++) {
      const count = 40;
      const spread = HEIGHT * 10;
      for (let i = 0; i < count; i++) {
        const x = Phaser.Math.Between(0, WIDTH);
        const y = Phaser.Math.Between(-spread, HEIGHT);
        const size = layer === 2 ? 2 : 1;
        const alpha = 0.2 + layer * 0.3;
        this.add.rectangle(x, y, size, size, GAME_CONFIG.COLOR_STAR, alpha).setScrollFactor(0.1 + layer * 0.15);
      }
    }
  }

  private spawnInitialPlatforms(): void {
    const { WIDTH, PLATFORM_VERTICAL_SPACING, PLATFORM_COUNT_VISIBLE, PLATFORM_WIDTH } = GAME_CONFIG;

    const firstPlatform = Platform.create(this, WIDTH / 2, this.worldOriginY, true);
    firstPlatform.setData('persistent', true);
    this.platforms.push(firstPlatform);

    for (let i = 1; i <= PLATFORM_COUNT_VISIBLE; i++) {
      const y = this.worldOriginY - i * PLATFORM_VERTICAL_SPACING;
      const x = Phaser.Math.Between(PLATFORM_WIDTH / 2 + 20, WIDTH - PLATFORM_WIDTH / 2 - 20);
      const platform = Platform.create(this, x, y);
      this.platforms.push(platform);
      
      if (Math.random() < GAME_CONFIG.OBSTACLE_SPAWN_CHANCE) {
        this.spawnObstacleNear(y);
      }
    }
  }

  private spawnObstacleNear(platformY: number): void {
    const { WIDTH } = GAME_CONFIG;
    const types: ObstacleType[] = [...GAME_CONFIG.OBSTACLE_TYPES];
    const type = types[Math.floor(Math.random() * types.length)];
    
    const minDistance = 60;
    let attempts = 0;
    let x: number;
    let y: number;
    
    do {
      x = Phaser.Math.Between(50, WIDTH - 50);
      y = platformY + Phaser.Math.Between(-150, 150);
      attempts++;
    } while (this.isObstacleOverlapping(x, y, minDistance) && attempts < 10);
    
    if (attempts >= 10) return;
    
    const obstacle = Obstacle.create(this, x, y, type);
    this.obstacles.push(obstacle);
  }

  private isObstacleOverlapping(x: number, y: number, minDistance: number): boolean {
    for (const obstacle of this.obstacles) {
      const dx = obstacle.x - x;
      const dy = obstacle.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < minDistance) return true;
    }
    return false;
  }

  private recyclePlatforms(): void {
    const camTop = this.cameras.main.scrollY;
    const camBottom = camTop + GAME_CONFIG.HEIGHT;
    const { WIDTH, PLATFORM_VERTICAL_SPACING, PLATFORM_WIDTH } = GAME_CONFIG;

    this.platforms.forEach((platform) => {
      if (platform.y >= camTop && platform.y <= camBottom) {
        platform.setData('visited', true);
      }
    });

    const recyclables: Phaser.Physics.Matter.Image[] = [];
    this.platforms.forEach((platform) => {
      if (!platform.getData('persistent') && !platform.getData('visited') && platform.y > camBottom + 200) {
        recyclables.push(platform);
      }
    });

    let topPlatformY = this.worldOriginY;
    this.platforms.forEach((platform) => {
      if (platform.y < topPlatformY) topPlatformY = platform.y;
    });

    let recycleIndex = 0;
    while (topPlatformY > camTop - GAME_CONFIG.HEIGHT) {
      const newTopY = topPlatformY - Phaser.Math.Between(80, PLATFORM_VERTICAL_SPACING);
      
      const x = Phaser.Math.Between(PLATFORM_WIDTH / 2 + 20, WIDTH - PLATFORM_WIDTH / 2 - 20);
      
      if (recycleIndex < recyclables.length) {
        const img = recyclables[recycleIndex];
        img.setPosition(x, newTopY);
        img.setStatic(true);
        recycleIndex++;
      } else {
        const platform = Platform.create(this, x, newTopY);
        this.platforms.push(platform);
        
        if (Math.random() < GAME_CONFIG.OBSTACLE_SPAWN_CHANCE) {
          this.spawnObstacleNear(newTopY);
        }
      }
      topPlatformY = newTopY;
    }

    this.obstacles = this.obstacles.filter((obstacle) => {
      if (obstacle.y > camBottom + 200) {
        obstacle.destroy();
        return false;
      }
      return true;
    });
  }

  private wrapShipHorizontal(): void {
    const { WIDTH } = GAME_CONFIG;
    const body = this.ship.matterBody;
    
    if (this.ship.x < 0) {
      const vx = body.velocity.x;
      const vy = body.velocity.y;
      this.ship.setPosition(WIDTH, this.ship.y);
      this.ship.setVelocity(vx, vy);
    } else if (this.ship.x > WIDTH) {
      const vx = body.velocity.x;
      const vy = body.velocity.y;
      this.ship.setPosition(0, this.ship.y);
      this.ship.setVelocity(vx, vy);
    }
  }

  private createHUD(): void {
    const { WIDTH, HEIGHT } = GAME_CONFIG;
    const style = { fontSize: '13px', color: '#ffffff', fontFamily: 'monospace' };
    const cyanStyle = { fontSize: '13px', color: '#00e5ff', fontFamily: 'monospace' };

    this.hudAltitude = this.add.text(12, 12, 'ALT: 0m', cyanStyle).setScrollFactor(0);
    this.hudSpeed = this.add.text(12, 30, 'SPD: 0 m/s', style).setScrollFactor(0);

    this.add.text(WIDTH - 12, 12, 'FUEL', style).setOrigin(1, 0).setScrollFactor(0);
    this.add.rectangle(WIDTH - 12, 30, 80, 10, 0x333355).setOrigin(1, 0).setScrollFactor(0);
    this.fuelBarFill = this.add.rectangle(WIDTH - 12, 30, 80, 10, GAME_CONFIG.COLOR_FUEL_BAR).setOrigin(1, 0).setScrollFactor(0);

    const indStyle = { fontSize: '11px', fontFamily: 'monospace' };
    this.controlIndicators = {
      left: this.add.text(12, HEIGHT - 44, '[←] LEFT', indStyle).setScrollFactor(0).setAlpha(0.3),
      up: this.add.text(WIDTH / 2 - 50, HEIGHT - 44, '[↑] THRUST', indStyle).setOrigin(0.5, 0).setScrollFactor(0).setAlpha(0.3),
      down: this.add.text(WIDTH / 2 + 50, HEIGHT - 44, '[↓] REVERSE', indStyle).setOrigin(0.5, 0).setScrollFactor(0).setAlpha(0.3),
      right: this.add.text(WIDTH - 12, HEIGHT - 44, '[→] RIGHT', indStyle).setOrigin(1, 0).setScrollFactor(0).setAlpha(0.3),
    };

    if (this.isDev) {
      const debugStyle = { fontSize: '11px', color: '#ffaa00', fontFamily: 'monospace' };
      this.debugInfo = this.add.text(12, 50, 'STATE: --\nFUEL: --', debugStyle).setScrollFactor(0);
    }
  }

  private updateHUD(thrusters: ThrusterState, altitude: number): void {
    const body = this.ship.matterBody;
    const speed = Math.round(Math.sqrt(body.velocity.x ** 2 + body.velocity.y ** 2));
    const fuel = this.ship.fuel;
    const fuelRatio = fuel / GAME_CONFIG.FUEL_MAX;

    this.hudAltitude.setText(`ALT: ${altitude}m  (MAX: ${this.maxAltitude}m)`);
    this.hudSpeed.setText(`SPD: ${speed} m/s`);

    const fuelColor = fuelRatio < 0.25 ? GAME_CONFIG.COLOR_FUEL_BAR_LOW : GAME_CONFIG.COLOR_FUEL_BAR;
    this.fuelBarFill.setFillStyle(fuelColor);
    this.fuelBarFill.width = 80 * fuelRatio;
    this.fuelBarFill.setOrigin(1, 0);

    this.controlIndicators.left.setAlpha(thrusters.left ? 1 : 0.3);
    this.controlIndicators.up.setAlpha(thrusters.up ? 1 : 0.3);
    this.controlIndicators.down.setAlpha(thrusters.down ? 1 : 0.3);
    this.controlIndicators.right.setAlpha(thrusters.right ? 1 : 0.3);

    if (this.isDev) {
      const isLanded = this.ship.isLanded;
      const shipState = isLanded
        ? (speed < 0.5 ? 'STOPPED' : 'LANDED')
        : 'MOVING';

      const fuelDelta = fuel - this.prevFuel;
      const fuelRate = (fuelDelta * 1000) / 16.67;
      const fuelLabel = fuelDelta < 0
        ? `BURN ${Math.abs(fuelRate).toFixed(1)}/s`
        : fuelDelta > 0
          ? `CHARGE +${fuelRate.toFixed(1)}/s`
          : 'IDLE';

      this.debugInfo.setText(`isLanded: ${isLanded}\nSPD: ${speed}\nSTATE: ${shipState}\nFUEL: ${fuelLabel}`);
      this.prevFuel = fuel;
    }
  }

  private triggerGameOver(): void {
    this.isGameOver = true;
    this.cameras.main.shake(400, 0.015);
    this.time.delayedCall(600, () => {
      this.scene.start('GameOverScene', { altitude: this.maxAltitude });
    });
  }
}
