import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig';
import { MapLoader, GameMap } from '../utils/MapLoader';

export class MenuScene extends Phaser.Scene {
  private maps: GameMap[] = [];
  private selectedMapIndex = 0;
  private mapText!: Phaser.GameObjects.Text;
  private mapDescriptionText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'MenuScene' });
  }

  async create(): Promise<void> {
    const { WIDTH, HEIGHT } = GAME_CONFIG;

    this.maps = await MapLoader.loadAll();

    this.add.rectangle(0, 0, WIDTH, HEIGHT, GAME_CONFIG.COLOR_BG).setOrigin(0);
    this.createStars();

    this.add.triangle(
      WIDTH / 2, HEIGHT / 2 - 120,
      0, -30, -20, 20, 20, 20,
      GAME_CONFIG.COLOR_SHIP
    );

    this.add.text(WIDTH / 2, HEIGHT / 2 - 50, 'CLIMBING SPACESHIP', {
      fontSize: '22px',
      color: '#00e5ff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.mapText = this.add.text(WIDTH / 2, HEIGHT / 2 + 20, this.getMapDisplayName(), {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.mapDescriptionText = this.add.text(WIDTH / 2, HEIGHT / 2 + 50, this.getMapDescription(), {
      fontSize: '12px',
      color: '#888888',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(WIDTH / 2, HEIGHT / 2 + 90, '[←→] SELECT MAP    [SPACE] START', {
      fontSize: '11px',
      color: '#666666',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.input.keyboard!.on('keydown-LEFT', () => {
      this.selectedMapIndex = (this.selectedMapIndex - 1 + this.maps.length) % this.maps.length;
      this.updateMapDisplay();
    });

    this.input.keyboard!.on('keydown-RIGHT', () => {
      this.selectedMapIndex = (this.selectedMapIndex + 1) % this.maps.length;
      this.updateMapDisplay();
    });

    this.input.keyboard!.once('keydown-SPACE', () => {
      const selectedMap = this.maps[this.selectedMapIndex];
      this.scene.start('GameScene', { mapId: selectedMap.id });
    });
  }

  private getMapDisplayName(): string {
    if (this.maps.length === 0) return 'RANDOM';
    return this.maps[this.selectedMapIndex].name;
  }

  private getMapDescription(): string {
    if (this.maps.length === 0) return 'Procedurally generated';
    const map = this.maps[this.selectedMapIndex];
    return `[${map.difficulty.toUpperCase()}] ${map.description}`;
  }

  private updateMapDisplay(): void {
    this.mapText.setText(this.getMapDisplayName());
    this.mapDescriptionText.setText(this.getMapDescription());
  }

  private createStars(): void {
    const { WIDTH, HEIGHT } = GAME_CONFIG;
    for (let i = 0; i < 80; i++) {
      const x = Phaser.Math.Between(0, WIDTH);
      const y = Phaser.Math.Between(0, HEIGHT);
      const size = Math.random() < 0.2 ? 2 : 1;
      this.add.rectangle(x, y, size, size, GAME_CONFIG.COLOR_STAR, Math.random() * 0.8 + 0.2);
    }
  }
}
