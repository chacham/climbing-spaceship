import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig';
import { Spaceship, ThrusterState } from '../objects/Spaceship';
import { Platform } from '../objects/Platform';

export class GameScene extends Phaser.Scene {
  private ship!: Spaceship;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private keyLeft!: Phaser.Input.Keyboard.Key;
  private keyRight!: Phaser.Input.Keyboard.Key;
  private keyUp!: Phaser.Input.Keyboard.Key;
  private keyDown!: Phaser.Input.Keyboard.Key;

  private hudAltitude!: Phaser.GameObjects.Text;
  private hudSpeed!: Phaser.GameObjects.Text;
  private fuelBarFill!: Phaser.GameObjects.Rectangle;
  private controlIndicators!: { left: Phaser.GameObjects.Text; right: Phaser.GameObjects.Text; up: Phaser.GameObjects.Text; down: Phaser.GameObjects.Text };

  private maxAltitude = 0;
  private worldOriginY = 0;
  private isGameOver = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  preload(): void {
    Spaceship.preloadTexture(this);
    Platform.preloadTexture(this);
  }

  create(): void {
    const { WIDTH, HEIGHT } = GAME_CONFIG;

    this.maxAltitude = 0;
    this.isGameOver = false;
    this.worldOriginY = HEIGHT - 80;

    this.physics.world.setBounds(0, -Number.MAX_SAFE_INTEGER / 2, WIDTH, Number.MAX_SAFE_INTEGER);
    this.physics.world.gravity.y = GAME_CONFIG.GRAVITY;

    this.cameras.main.setBackgroundColor(GAME_CONFIG.COLOR_BG);
    this.cameras.main.setBounds(0, -Number.MAX_SAFE_INTEGER / 2, WIDTH, Number.MAX_SAFE_INTEGER);

    this.createStarfield();

    this.platforms = this.physics.add.staticGroup();
    this.spawnInitialPlatforms();

    this.ship = new Spaceship(this, GAME_CONFIG.SHIP_START_X, GAME_CONFIG.SHIP_START_Y);
    this.cameras.main.startFollow(this.ship, true, 0.08, 0.08);
    this.cameras.main.setFollowOffset(0, HEIGHT * 0.25);

    this.physics.add.collider(this.ship, this.platforms, (_ship, platform) => {
      this.ship.land();
      (platform as Phaser.Physics.Arcade.Image).setData('visited', true);
    });

    this.keyLeft = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    this.keyRight = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    this.keyUp = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.keyDown = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);

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

    const body = this.ship.body as Phaser.Physics.Arcade.Body;
    if (!body.touching.down && !body.blocked.down) {
      this.ship.liftOff();
    }

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

    const firstPlatform = this.platforms.create(WIDTH / 2, this.worldOriginY, '__platform_full');
    firstPlatform.setData('persistent', true);

    for (let i = 1; i <= PLATFORM_COUNT_VISIBLE; i++) {
      const y = this.worldOriginY - i * PLATFORM_VERTICAL_SPACING;
      const x = Phaser.Math.Between(PLATFORM_WIDTH / 2 + 20, WIDTH - PLATFORM_WIDTH / 2 - 20);
      this.platforms.create(x, y, '__platform');
    }
  }

private recyclePlatforms(): void {
    const camTop = this.cameras.main.scrollY;
    const camBottom = camTop + GAME_CONFIG.HEIGHT;
    const { WIDTH, PLATFORM_VERTICAL_SPACING, PLATFORM_WIDTH } = GAME_CONFIG;

    this.platforms.getChildren().forEach((child) => {
      const img = child as Phaser.Physics.Arcade.Image;
      
      if (img.y >= camTop && img.y <= camBottom) {
        img.setData('visited', true);
      }
    });

    const recyclables: Phaser.Physics.Arcade.Image[] = [];
    this.platforms.getChildren().forEach((child) => {
      const img = child as Phaser.Physics.Arcade.Image;
      if (!img.getData('persistent') && !img.getData('visited') && img.y > camBottom + 200) {
        recyclables.push(img);
      }
    });

    let topPlatformY = this.worldOriginY;
    this.platforms.getChildren().forEach((child) => {
      const img = child as Phaser.Physics.Arcade.Image;
      if (img.y < topPlatformY) topPlatformY = img.y;
    });

    let recycleIndex = 0;
    while (topPlatformY > camTop - GAME_CONFIG.HEIGHT) {
      const newTopY = topPlatformY - Phaser.Math.Between(80, PLATFORM_VERTICAL_SPACING);
      
      if (recycleIndex < recyclables.length) {
        const img = recyclables[recycleIndex];
        const x = Phaser.Math.Between(PLATFORM_WIDTH / 2 + 20, WIDTH - PLATFORM_WIDTH / 2 - 20);
        img.setPosition(x, newTopY);
        (img.body as Phaser.Physics.Arcade.StaticBody).reset(x, newTopY);
        recycleIndex++;
      } else {
        const x = Phaser.Math.Between(PLATFORM_WIDTH / 2 + 20, WIDTH - PLATFORM_WIDTH / 2 - 20);
        this.platforms.create(x, newTopY, '__platform');
      }
      topPlatformY = newTopY;
    }
  }

  private wrapShipHorizontal(): void {
    const { WIDTH } = GAME_CONFIG;
    const body = this.ship.body as Phaser.Physics.Arcade.Body;
    
    if (this.ship.x < 0) {
      const vx = body.velocity.x;
      const vy = body.velocity.y;
      this.ship.x = WIDTH;
      body.reset(WIDTH, this.ship.y);
      body.setVelocity(vx, vy);
    } else if (this.ship.x > WIDTH) {
      const vx = body.velocity.x;
      const vy = body.velocity.y;
      this.ship.x = 0;
      body.reset(0, this.ship.y);
      body.setVelocity(vx, vy);
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
  }

  private updateHUD(thrusters: ThrusterState, altitude: number): void {
    const body = this.ship.body as Phaser.Physics.Arcade.Body;
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
  }

  private triggerGameOver(): void {
    this.isGameOver = true;
    this.cameras.main.shake(400, 0.015);
    this.time.delayedCall(600, () => {
      this.scene.start('GameOverScene', { altitude: this.maxAltitude });
    });
  }
}
