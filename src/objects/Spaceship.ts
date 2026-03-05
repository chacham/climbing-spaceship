import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig';

export interface ThrusterState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
}

export class Spaceship extends Phaser.Physics.Arcade.Sprite {
  private flameGraphics!: Phaser.GameObjects.Graphics;
  private _fuel: number = GAME_CONFIG.FUEL_MAX;
  private _isLanded: boolean = false;
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
    body.setBounce(0, GAME_CONFIG.BOUNCE_COEFFICIENT);
    body.maxAngular = GAME_CONFIG.ROTATE_MAX_SPEED;

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

  land(): void {
    this._isLanded = true;
  }

  liftOff(): void {
    this._isLanded = false;
  }

  applyThrusters(
    thrusters: ThrusterState,
    altitudeScale: number,
    delta: number
  ): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const dt = delta / 1000;
    
    const activeActions =
      (thrusters.left ? 1 : 0) +
      (thrusters.right ? 1 : 0) +
      (thrusters.up ? 1 : 0) +
      (thrusters.down ? 1 : 0);

    if (activeActions > 0 && this._fuel > 0) {
      const fuelCost = GAME_CONFIG.FUEL_BURN_RATE * activeActions * dt;
      this._fuel = Math.max(0, this._fuel - fuelCost);

      if (thrusters.left) {
        body.angularVelocity -= GAME_CONFIG.ROTATE_ACCELERATION * dt;
        const rad = Phaser.Math.DegToRad(this.angle - 90);
        const thrustForce = GAME_CONFIG.THRUST_FORCE * 0.5 * altitudeScale * dt;
        body.setVelocity(
          body.velocity.x + Math.cos(rad) * thrustForce,
          body.velocity.y + Math.sin(rad) * thrustForce
        );
      }
      if (thrusters.right) {
        body.angularVelocity += GAME_CONFIG.ROTATE_ACCELERATION * dt;
        const rad = Phaser.Math.DegToRad(this.angle - 90);
        const thrustForce = GAME_CONFIG.THRUST_FORCE * 0.5 * altitudeScale * dt;
        body.setVelocity(
          body.velocity.x + Math.cos(rad) * thrustForce,
          body.velocity.y + Math.sin(rad) * thrustForce
        );
      }
      if (thrusters.up) {
        const rad = Phaser.Math.DegToRad(this.angle - 90);
        const thrustForce = GAME_CONFIG.THRUST_FORCE * altitudeScale * dt;
        body.setVelocity(
          body.velocity.x + Math.cos(rad) * thrustForce,
          body.velocity.y + Math.sin(rad) * thrustForce
        );
      }
      if (thrusters.down) {
        const rad = Phaser.Math.DegToRad(this.angle + 90);
        const thrustForce = GAME_CONFIG.THRUST_FORCE * 0.5 * altitudeScale * dt;
        body.setVelocity(
          body.velocity.x + Math.cos(rad) * thrustForce,
          body.velocity.y + Math.sin(rad) * thrustForce
        );
      }
    }

    if (this._isLanded) {
      const frictionFactor = Math.pow(1 - GAME_CONFIG.LAND_FRICTION, dt * 60);
      body.setVelocity(body.velocity.x * frictionFactor, body.velocity.y);
      body.angularVelocity *= frictionFactor;
    }

    if (activeActions === 0) {
      let refillRate: number = GAME_CONFIG.FUEL_REFILL_BASE;
      if (this._isLanded) {
        const speed = body.velocity.length();
        refillRate = speed < 5 ? GAME_CONFIG.FUEL_REFILL_STOPPED : GAME_CONFIG.FUEL_REFILL_LANDED;
      }
      this._fuel = Math.min(GAME_CONFIG.FUEL_MAX, this._fuel + refillRate * dt);
    }

    this.drawFlames(thrusters);
  }

  private drawFlames(thrusters: ThrusterState): void {
    this.flameGraphics.clear();
    if (this._fuel <= 0) return;

    const cx = this.x;
    const cy = this.y;
    const angleRad = Phaser.Math.DegToRad(this.angle);
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);

    const rotate = (lx: number, ly: number): [number, number] => [
      cx + lx * cos - ly * sin,
      cy + lx * sin + ly * cos,
    ];

    const anyActive = thrusters.left || thrusters.right || thrusters.up || thrusters.down;

    if (anyActive) {
      const len = Phaser.Math.Between(10, 20);
      const [ax, ay] = rotate(-6, 18);
      const [bx, by] = rotate(6, 18);
      const [cx2, cy2] = rotate(0, 18 + len);
      this.flameGraphics.fillStyle(GAME_CONFIG.COLOR_THRUSTER_FLAME, 0.9);
      this.flameGraphics.fillTriangle(ax, ay, bx, by, cx2, cy2);
    }

    if (thrusters.down) {
      const len = Phaser.Math.Between(6, 12);
      this.flameGraphics.fillStyle(0x00aaff, 0.85);
      const [ax, ay] = rotate(-14, -2);
      const [bx, by] = rotate(-6, -2);
      const [cx2, cy2] = rotate(-10, -2 - len);
      this.flameGraphics.fillTriangle(ax, ay, bx, by, cx2, cy2);
      const [dx, dy] = rotate(6, -2);
      const [ex, ey] = rotate(14, -2);
      const [fx, fy] = rotate(10, -2 - len);
      this.flameGraphics.fillTriangle(dx, dy, ex, ey, fx, fy);
    }
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    this.flameGraphics.x = 0;
    this.flameGraphics.y = 0;
  }

  destroy(fromScene?: boolean): void {
    this.flameGraphics.destroy();
    super.destroy(fromScene);
  }
}
