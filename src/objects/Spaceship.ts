import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig';

export interface ThrusterState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
}

interface ThrusterTimes {
  left: number;
  right: number;
  up: number;
  down: number;
}

export class Spaceship extends Phaser.Physics.Matter.Sprite {
  private flameGraphics!: Phaser.GameObjects.Graphics;
  private _fuel: number = GAME_CONFIG.FUEL_MAX;
  private _isLanded: boolean = false;
  private _altitude: number = 0;
  private _currentForce: number = 0;
  private _currentTorque: number = 0;
  private _angularVelocityDeg: number = 0;

  private thrusterTime: ThrusterTimes = { left: 0, right: 0, up: 0, down: 0 };
  get fuel(): number { return this._fuel; }
  get isLanded(): boolean { return this._isLanded; }
  get altitude(): number { return this._altitude; }
  get matterBody(): MatterJS.BodyType { return this.body as MatterJS.BodyType; }
  get currentForce(): number { return this._currentForce; }
  get currentTorque(): number { return this._currentTorque; }
  get angularVelocityDeg(): number { return this._angularVelocityDeg; }

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene.matter.world, x, y, '__spaceship');

    this.setBody({
      type: 'fromVertices',
      verts: [
        { x: 0, y: -18 },
        { x: -16, y: 18 },
        { x: 16, y: 18 },
      ],
    }, {
      label: 'spaceship',
      restitution: GAME_CONFIG.BOUNCE_COEFFICIENT,
      friction: 0.1,
      frictionAir: 0,
      slop: 0.05,
      collisionFilter: {
        category: 0x0001,
        mask: 0x0002 | 0x0004,
      },
    });

    scene.add.existing(this);
    this.setOrigin(0.5, 0.5);

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
    const dt = delta / 1000;
    
    if (thrusters.left) this.thrusterTime.left = Math.min(GAME_CONFIG.ROTATE_RAMP_UP_TIME, this.thrusterTime.left + dt);
    else this.thrusterTime.left = Math.max(0, this.thrusterTime.left - dt * (GAME_CONFIG.ROTATE_RAMP_UP_TIME / GAME_CONFIG.ROTATE_RAMP_DOWN_TIME));
    if (thrusters.right) this.thrusterTime.right = Math.min(GAME_CONFIG.ROTATE_RAMP_UP_TIME, this.thrusterTime.right + dt);
    else this.thrusterTime.right = Math.max(0, this.thrusterTime.right - dt * (GAME_CONFIG.ROTATE_RAMP_UP_TIME / GAME_CONFIG.ROTATE_RAMP_DOWN_TIME));
    if (thrusters.up) this.thrusterTime.up = Math.min(GAME_CONFIG.THRUST_RAMP_UP_TIME, this.thrusterTime.up + dt);
    else this.thrusterTime.up = Math.max(0, this.thrusterTime.up - dt * (GAME_CONFIG.THRUST_RAMP_UP_TIME / GAME_CONFIG.THRUST_RAMP_DOWN_TIME));
    if (thrusters.down) this.thrusterTime.down = Math.min(GAME_CONFIG.THRUST_RAMP_UP_TIME, this.thrusterTime.down + dt);
    else this.thrusterTime.down = Math.max(0, this.thrusterTime.down - dt * (GAME_CONFIG.THRUST_RAMP_UP_TIME / GAME_CONFIG.THRUST_RAMP_DOWN_TIME));

    const rampUp = (time: number, duration: number) => Math.min(1, time / duration);
    
    const activeActions =
      (thrusters.left ? 1 : 0) +
      (thrusters.right ? 1 : 0) +
      (thrusters.up ? 1 : 0) +
      (thrusters.down ? 1 : 0);

    if (activeActions > 0 && this._fuel > 0) {
      const fuelCost = GAME_CONFIG.FUEL_BURN_RATE * activeActions * dt;
      this._fuel = Math.max(0, this._fuel - fuelCost);

      const baseThrustMultiplier = 0.008 * altitudeScale;
      const rotationMultiplier = GAME_CONFIG.ROTATE_ACCELERATION_MULTIPLIER;

      let totalForce = 0;
      let totalTorque = 0;

      if (thrusters.left) {
        const ramp = rampUp(this.thrusterTime.left, GAME_CONFIG.ROTATE_RAMP_UP_TIME);
        let angularDelta = GAME_CONFIG.ROTATE_ACCELERATION * dt * rotationMultiplier * ramp;
        angularDelta = Math.min(angularDelta, GAME_CONFIG.MAX_TORQUE * dt);
        this._angularVelocityDeg -= angularDelta;
        totalTorque += angularDelta;
      }
      if (thrusters.right) {
        const ramp = rampUp(this.thrusterTime.right, GAME_CONFIG.ROTATE_RAMP_UP_TIME);
        let angularDelta = GAME_CONFIG.ROTATE_ACCELERATION * dt * rotationMultiplier * ramp;
        angularDelta = Math.min(angularDelta, GAME_CONFIG.MAX_TORQUE * dt);
        this._angularVelocityDeg += angularDelta;
        totalTorque += angularDelta;
      }
      if (thrusters.up) {
        const ramp = rampUp(this.thrusterTime.up, GAME_CONFIG.THRUST_RAMP_UP_TIME);
        const rad = Phaser.Math.DegToRad(this.angle - 90);
        let thrustForce = GAME_CONFIG.THRUST_FORCE * baseThrustMultiplier * ramp;
        thrustForce = Math.min(thrustForce, GAME_CONFIG.MAX_THRUST_FORCE * ramp);
        this.setVelocity(
          this.body!.velocity.x + Math.cos(rad) * thrustForce,
          this.body!.velocity.y + Math.sin(rad) * thrustForce
        );
        totalForce += thrustForce;
      }
      if (thrusters.down) {
        const ramp = rampUp(this.thrusterTime.down, GAME_CONFIG.THRUST_RAMP_UP_TIME);
        const rad = Phaser.Math.DegToRad(this.angle + 90);
        let thrustForce = GAME_CONFIG.RETRO_FORCE * 0.5 * baseThrustMultiplier * ramp;
        thrustForce = Math.min(thrustForce, GAME_CONFIG.MAX_THRUST_FORCE * ramp);
        this.setVelocity(
          this.body!.velocity.x + Math.cos(rad) * thrustForce,
          this.body!.velocity.y + Math.sin(rad) * thrustForce
        );
        totalForce += thrustForce;
      }

      this._currentForce = totalForce;
      this._currentTorque = totalTorque;
    } else {
      this._currentForce = 0;
      this._currentTorque = 0;
    }

    this._angularVelocityDeg = Phaser.Math.Clamp(
      this._angularVelocityDeg,
      -GAME_CONFIG.ROTATE_MAX_SPEED,
      GAME_CONFIG.ROTATE_MAX_SPEED
    );

    if (this._isLanded) {
      const frictionFactor = Math.pow(1 - GAME_CONFIG.LAND_FRICTION, dt * 60);
      this.setVelocity(
        this.body!.velocity.x * frictionFactor,
        this.body!.velocity.y
      );
      if (!thrusters.left && !thrusters.right) {
        this._angularVelocityDeg *= frictionFactor;
      }
    }

    this.setAngle(this.angle + this._angularVelocityDeg * dt);

    if (activeActions === 0) {
      let refillRate: number = GAME_CONFIG.FUEL_REFILL_BASE;
      if (this._isLanded) {
        const speed = Math.sqrt(this.body!.velocity.x ** 2 + this.body!.velocity.y ** 2);
        refillRate = speed < 0.5 ? GAME_CONFIG.FUEL_REFILL_STOPPED : GAME_CONFIG.FUEL_REFILL_LANDED;
      }
      this._fuel = Math.min(GAME_CONFIG.FUEL_MAX, this._fuel + refillRate * dt);
    }

    this.drawFlames(thrusters);
  }

  private drawFlames(thrusters: ThrusterState): void {
    this.flameGraphics.clear();
    if (this._fuel <= 0) return;

    const rampUp = (time: number, duration: number) => Math.min(1, time / duration);
    const mainRamp = Math.max(
      rampUp(this.thrusterTime.up, GAME_CONFIG.THRUST_RAMP_UP_TIME),
      rampUp(this.thrusterTime.left, GAME_CONFIG.ROTATE_RAMP_UP_TIME),
      rampUp(this.thrusterTime.right, GAME_CONFIG.ROTATE_RAMP_UP_TIME)
    );
    const retroRamp = rampUp(this.thrusterTime.down, GAME_CONFIG.THRUST_RAMP_UP_TIME);

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
      const baseLen = 10 + mainRamp * 10;
      const len = Phaser.Math.Between(Math.floor(baseLen), Math.floor(baseLen + 10));
      const [ax, ay] = rotate(-6, 18);
      const [bx, by] = rotate(6, 18);
      const [cx2, cy2] = rotate(0, 18 + len);
      this.flameGraphics.fillStyle(GAME_CONFIG.COLOR_THRUSTER_FLAME, 0.9);
      this.flameGraphics.fillTriangle(ax, ay, bx, by, cx2, cy2);
    }

    if (thrusters.down) {
      const baseLen = 6 + retroRamp * 6;
      const len = Phaser.Math.Between(Math.floor(baseLen), Math.floor(baseLen + 6));
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

  destroy(fromScene?: boolean): void {
    this.flameGraphics.destroy();
    super.destroy(fromScene);
  }
}
