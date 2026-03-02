import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig';

export type ThrusterKey = 'left' | 'right' | 'retro';

export interface ThrusterState {
  left: boolean;
  right: boolean;
  retro: boolean;
}

export class Spaceship extends Phaser.Physics.Arcade.Sprite {
  private flameGraphics!: Phaser.GameObjects.Graphics;
  private _fuel: number = GAME_CONFIG.FUEL_MAX;
  private _isLanded: boolean = false;
  private _landedTime: number = 0;
  private _altitude: number = 0;

  get fuel(): number { return this._fuel; }
  get isLanded(): boolean { return this._isLanded; }
  get altitude(): number { return this._altitude; }

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, '__spaceship');

    scene.physics.add.existing(this);
    scene.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(false);
    body.setMaxVelocity(600, 800);
    body.setGravityY(0);

    this.flameGraphics = scene.add.graphics();
    this.setDepth(10);
    this.flameGraphics.setDepth(9);
  }

  static preloadTexture(scene: Phaser.Scene): void {
    const g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(GAME_CONFIG.COLOR_SHIP);
    g.fillTriangle(16, 0, 0, 36, 32, 36);
    g.generateTexture('__spaceship', 32, 36);
    g.destroy();
  }

  setAltitude(altitude: number): void {
    this._altitude = altitude;
  }

  land(time: number): void {
    if (!this._isLanded) {
      this._isLanded = true;
      this._landedTime = time;
    }
  }

  liftOff(): void {
    this._isLanded = false;
  }

  applyThrusters(
    thrusters: ThrusterState,
    altitudeScale: number,
    delta: number,
    time: number
  ): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const dt = delta / 1000;
    const activeThrusterCount =
      (thrusters.left ? 1 : 0) +
      (thrusters.right ? 1 : 0) +
      (thrusters.retro ? 1 : 0);

    if (activeThrusterCount > 0 && this._fuel > 0) {
      const fuelCost = GAME_CONFIG.FUEL_BURN_RATE * activeThrusterCount * dt;
      this._fuel = Math.max(0, this._fuel - fuelCost);

      if (thrusters.left) {
        body.setVelocityX(body.velocity.x + GAME_CONFIG.THRUSTER_LEFT_VX * altitudeScale * dt);
        body.setVelocityY(body.velocity.y + GAME_CONFIG.THRUSTER_LEFT_VY * altitudeScale * dt);
      }
      if (thrusters.right) {
        body.setVelocityX(body.velocity.x + GAME_CONFIG.THRUSTER_RIGHT_VX * altitudeScale * dt);
        body.setVelocityY(body.velocity.y + GAME_CONFIG.THRUSTER_RIGHT_VY * altitudeScale * dt);
      }
      if (thrusters.retro) {
        body.setVelocityX(body.velocity.x + GAME_CONFIG.RETRO_VX * altitudeScale * dt);
        body.setVelocityY(body.velocity.y + GAME_CONFIG.RETRO_VY * altitudeScale * dt);
      }
    }

    if (this._isLanded) {
      const elapsed = time - this._landedTime;
      if (elapsed >= GAME_CONFIG.FUEL_REFILL_DELAY_MS) {
        this._fuel = Math.min(GAME_CONFIG.FUEL_MAX, this._fuel + GAME_CONFIG.FUEL_REFILL_RATE * dt);
      }
    }

    this.drawFlames(thrusters);
  }

  private drawFlames(thrusters: ThrusterState): void {
    this.flameGraphics.clear();
    this.flameGraphics.x = this.x;
    this.flameGraphics.y = this.y;

    if (this._fuel <= 0) return;

    if (thrusters.left) {
      this.flameGraphics.fillStyle(GAME_CONFIG.COLOR_THRUSTER_FLAME, 0.9);
      const len = Phaser.Math.Between(8, 16);
      this.flameGraphics.fillTriangle(-12, 18, -2, 18, -8, 18 + len);
    }
    if (thrusters.right) {
      this.flameGraphics.fillStyle(GAME_CONFIG.COLOR_THRUSTER_FLAME, 0.9);
      const len = Phaser.Math.Between(8, 16);
      this.flameGraphics.fillTriangle(2, 18, 12, 18, 8, 18 + len);
    }
    if (thrusters.retro) {
      this.flameGraphics.fillStyle(0x00aaff, 0.85);
      const len = Phaser.Math.Between(6, 12);
      this.flameGraphics.fillTriangle(8, -2, 20, -2, 14, -2 - len);
      this.flameGraphics.fillTriangle(-8, -2, -20, -2, -14, -2 - len);
    }
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    this.flameGraphics.x = this.x;
    this.flameGraphics.y = this.y;
  }

  destroy(fromScene?: boolean): void {
    this.flameGraphics.destroy();
    super.destroy(fromScene);
  }
}
