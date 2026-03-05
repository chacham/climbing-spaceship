import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig';
import { Spaceship, ThrusterState } from '../objects/Spaceship';
import { Platform } from '../objects/Platform';

export class GameScene extends Phaser.Scene {
  private ship!: Spaceship;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private keyZ!: Phaser.Input.Keyboard.Key;
  private keyX!: Phaser.Input.Keyboard.Key;
  private keyC!: Phaser.Input.Keyboard.Key;

  private hudAltitude!: Phaser.GameObjects.Text;
  private hudSpeed!: Phaser.GameObjects.Text;
  private fuelBarFill!: Phaser.GameObjects.Rectangle;
  private thrusterIndicators!: { z: Phaser.GameObjects.Text; x: Phaser.GameObjects.Text; c: Phaser.GameObjects.Text };

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

    this.physics.add.collider(this.ship, this.platforms, () => {
      this.ship.land(this.time.now);
    });

    this.keyZ = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    this.keyX = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.X);
    this.keyC = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.C);

    this.createHUD();
  }

  update(time: number, delta: number): void {
    if (this.isGameOver) return;

    const thrusters: ThrusterState = {
      left: this.keyZ.isDown,
      right: this.keyC.isDown,
      retro: this.keyX.isDown,
    };

    const altitude = this.computeAltitude();
    const altitudeScale = this.computeAltitudeScale(altitude);

    this.ship.setAltitude(altitude);
    this.ship.applyThrusters(thrusters, altitudeScale, delta, time);

    if (altitude > this.maxAltitude) this.maxAltitude = altitude;

    const body = this.ship.body as Phaser.Physics.Arcade.Body;
    if (!body.touching.down && !body.blocked.down) {
      this.ship.liftOff();
    }

    this.clampShipHorizontal();
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

    for (let i = 0; i <= PLATFORM_COUNT_VISIBLE; i++) {
      const y = this.worldOriginY - i * PLATFORM_VERTICAL_SPACING;
      const x = i === 0
        ? WIDTH / 2
        : Phaser.Math.Between(PLATFORM_WIDTH / 2 + 20, WIDTH - PLATFORM_WIDTH / 2 - 20);
      this.platforms.create(x, y, '__platform');
    }
  }

  private recyclePlatforms(): void {
    const camTop = this.cameras.main.scrollY;
    const camBottom = camTop + GAME_CONFIG.HEIGHT;
    const { WIDTH, PLATFORM_VERTICAL_SPACING, PLATFORM_WIDTH } = GAME_CONFIG;

    this.platforms.getChildren().forEach((child) => {
      const img = child as Phaser.Physics.Arcade.Image;
      if (img.y > camBottom + 200) {
        const topY = camTop - Phaser.Math.Between(80, PLATFORM_VERTICAL_SPACING);
        const x = Phaser.Math.Between(PLATFORM_WIDTH / 2 + 20, WIDTH - PLATFORM_WIDTH / 2 - 20);
        img.setPosition(x, topY);
        (img.body as Phaser.Physics.Arcade.StaticBody).reset(x, topY);
      }
    });
  }

  private clampShipHorizontal(): void {
    const { WIDTH } = GAME_CONFIG;
    if (this.ship.x < 20) {
      this.ship.x = 20;
      (this.ship.body as Phaser.Physics.Arcade.Body).setVelocityX(0);
    } else if (this.ship.x > WIDTH - 20) {
      this.ship.x = WIDTH - 20;
      (this.ship.body as Phaser.Physics.Arcade.Body).setVelocityX(0);
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
    this.thrusterIndicators = {
      z: this.add.text(12, HEIGHT - 44, '[Z] ROTATE L', indStyle).setScrollFactor(0).setAlpha(0.3),
      x: this.add.text(WIDTH / 2, HEIGHT - 44, '[X] RETRO', indStyle).setOrigin(0.5, 0).setScrollFactor(0).setAlpha(0.3),
      c: this.add.text(WIDTH - 12, HEIGHT - 44, '[C] ROTATE R', indStyle).setOrigin(1, 0).setScrollFactor(0).setAlpha(0.3),
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

    this.thrusterIndicators.z.setAlpha(thrusters.left ? 1 : 0.3);
    this.thrusterIndicators.x.setAlpha(thrusters.retro ? 1 : 0.3);
    this.thrusterIndicators.c.setAlpha(thrusters.right ? 1 : 0.3);
  }

  private triggerGameOver(): void {
    this.isGameOver = true;
    this.cameras.main.shake(400, 0.015);
    this.time.delayedCall(600, () => {
      this.scene.start('GameOverScene', { altitude: this.maxAltitude });
    });
  }
}
