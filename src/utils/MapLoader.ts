import { ObstacleType } from '../objects/Obstacle';

export interface MapPlatform {
  x: number;
  y: number;
  width?: number;
  isFullWidth?: boolean;
  isPersistent?: boolean;
}

export interface MapObstacle {
  x: number;
  y: number;
  type: ObstacleType;
  rotation?: number;
}

export interface GameMap {
  id: string;
  name: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  shipStart: { x: number; y: number };
  platforms: MapPlatform[];
  obstacles: MapObstacle[];
}

export class MapLoader {
  private static cache: Map<string, GameMap> = new Map();

  static async load(mapId: string): Promise<GameMap> {
    if (this.cache.has(mapId)) {
      return this.cache.get(mapId)!;
    }

    const response = await fetch(`/maps/${mapId}.json`);
    if (!response.ok) {
      throw new Error(`Failed to load map: ${mapId}`);
    }

    const mapData = await response.json();
    this.cache.set(mapId, mapData);
    return mapData;
  }

  static async loadAll(): Promise<GameMap[]> {
    const maps: GameMap[] = [];
    const mapIds = ['basic', 'triangle_gauntlet', 'asteroid_field'];

    for (const id of mapIds) {
      try {
        const map = await this.load(id);
        maps.push(map);
      } catch (error) {
        console.error(`Failed to load map ${id}:`, error);
      }
    }

    return maps;
  }

  static clearCache(): void {
    this.cache.clear();
  }
}
