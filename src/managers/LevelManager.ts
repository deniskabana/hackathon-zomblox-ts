import { GRID_CONFIG, gridToWorld, WORLD_SIZE, type WorldPosition } from "../config/gameGrid";
import Player from "../entities/Player";
import Zombie from "../entities/Zombie";
import { gameInstance } from "../main";
import type { LevelState } from "../types/LevelState";
import { ZIndex } from "./DrawManager";

enum GridTileState { AVAILABLE, BLOCKED, PLAYER };

export default class LevelManager {
  public worldWidth = WORLD_SIZE.WIDTH;
  public worldHeight = WORLD_SIZE.HEIGHT;
  public levelState: LevelState;
  public levelGrid: GridTileState[][];

  // Entities
  public player: Player;
  public zombies: Zombie[] = [];

  // Gameplay
  private isSpawningZombies: boolean = false;
  private zombieSpawnInterval: number = 1000;
  private spawnTimer: number = 0;

  constructor() {
    this.levelState = {
      phase: "night",
      daysCounter: 0,
    };

    const levelGrid: typeof this.levelGrid = [];
    for (let x = 0; x < GRID_CONFIG.GRID_WIDTH; x++) {
      const columns: GridTileState[] = [];
      for (let y = 0; y < GRID_CONFIG.GRID_HEIGHT; y++) {
        columns.push(GridTileState.AVAILABLE);
      }
      levelGrid.push(columns);
    }
    this.levelGrid = levelGrid;

    this.player = new Player({ x: 220, y: 160 });
  }

  public update(_deltaTime: number) {
    this.player.update(_deltaTime);

    for (const zombie of this.zombies) {
      zombie.update(_deltaTime);
    }

    if (this.isSpawningZombies) this.spawnTimer += _deltaTime;

    if (this.spawnTimer > this.zombieSpawnInterval / 1000) {
      this.spawnZombie();
      this.spawnTimer = 0;
    }
  }

  public init(): void {
    this.startSpawningZombies();
  }

  public drawEntities(_deltaTime: number): void {
    this.player.draw(_deltaTime);

    for (const zombie of this.zombies) {
      zombie.draw(_deltaTime);
    }

    this.levelGrid.forEach((gridRow, x) => {
      gridRow.forEach((_gridCol, y) => {
        const tileWorldPos = gridToWorld({ x, y });
        const texture = gameInstance.MANAGERS.AssetManager.getImageAsset("ITextureGround");
        if (!texture) return;

        gameInstance.MANAGERS.DrawManager.queueDraw(
          tileWorldPos.x,
          tileWorldPos.y,
          texture,
          GRID_CONFIG.TILE_SIZE,
          GRID_CONFIG.TILE_SIZE,
          ZIndex.GROUND,
        );
      });
    });
  }

  private startSpawningZombies(): void {
    this.isSpawningZombies = true;
  }

  public stopSpawningZombies(): void {
    this.isSpawningZombies = false;
  }

  public spawnZombie(): void {
    if (this.zombies.length > 20) return;
    this.zombies.push(new Zombie(this.getRandomZombieSpawnPosition()));
  }

  private getRandomZombieSpawnPosition(margin: number = 50): WorldPosition {
    // Random out of viewport edge: 0 = top, 1 = right, 2 = bottom, 3 = left
    const edge = Math.floor(Math.random() * 4);

    switch (edge) {
      case 0:
        return {
          x: Math.random() * WORLD_SIZE.WIDTH,
          y: -margin,
        };

      case 1:
        return {
          x: WORLD_SIZE.WIDTH + margin,
          y: Math.random() * WORLD_SIZE.HEIGHT,
        };

      case 2:
        return {
          x: Math.random() * WORLD_SIZE.WIDTH,
          y: WORLD_SIZE.HEIGHT + margin,
        };

      case 3:
      default:
        return {
          x: -margin,
          y: Math.random() * WORLD_SIZE.HEIGHT,
        };
    }
  }

  public endNight() {
    if (this.levelState.phase !== "night") return;
    this.levelState.phase = "day";
    this.levelState.daysCounter += 1;
    // TODO: UI and game changes
  }

  public endDay() {
    if (this.levelState.phase !== "day") return;
    this.levelState.phase = "night";
    // TODO: UI and game changes
  }
}
