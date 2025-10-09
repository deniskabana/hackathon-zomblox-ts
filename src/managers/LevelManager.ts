import {
  GRID_CONFIG,
  gridToWorld,
  WORLD_SIZE,
  worldToGrid,
  type GridPosition,
  type WorldPosition,
} from "../config/gameGrid";
import type AEntity from "../entities/AEntity";
import BlockWood from "../entities/BlockWood";
import Player from "../entities/Player";
import Zombie from "../entities/Zombie";
import { gameInstance } from "../main";
import type { LevelState } from "../types/LevelState";
import getVectorDistance from "../utils/getVectorDistance";
import radiansToVector from "../utils/radiansToVector";
import { ZIndex } from "./DrawManager";

enum GridTileState {
  AVAILABLE,
  BLOCKED,
  PLAYER,
}
type GridTileRef = AEntity; // TODO: Also add static map parts later!

export interface GridTile {
  state: GridTileState;
  ref: GridTileRef | null;
}
export type LevelGrid = GridTile[][];

export default class LevelManager {
  public worldWidth = WORLD_SIZE.WIDTH;
  public worldHeight = WORLD_SIZE.HEIGHT;
  public levelState: LevelState;
  public levelGrid: LevelGrid;

  // Entities
  public player: Player;
  public zombies: Zombie[] = [];
  public blocks: BlockWood[] = [];

  // Gameplay
  private isSpawningZombies: boolean = false;
  private zombieSpawnInterval: number = 1000;
  private spawnTimer: number = 0;

  constructor() {
    this.player = new Player({ x: 6, y: 6 });
    this.blocks.push(new BlockWood({ x: 8, y: 12 }));
    this.levelState = {
      phase: "night",
      daysCounter: 0,
    };

    const levelGrid = this.generateEmptyLevelGrid();
    this.levelGrid = levelGrid;
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

    for (const block of this.blocks) {
      block.draw();
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
    if (this.zombies.length >= 20) return;
    this.zombies.push(new Zombie(this.getRandomZombieSpawnPosition()));
  }

  private getRandomZombieSpawnPosition(margin: number = 2): WorldPosition {
    // Random out of viewport edge: 0 = top, 1 = right, 2 = bottom, 3 = left
    const edge = Math.floor(Math.random() * 4);

    switch (edge) {
      case 0:
        return {
          x: Math.random() * GRID_CONFIG.GRID_WIDTH,
          y: -margin,
        };

      case 1:
        return {
          x: WORLD_SIZE.WIDTH + margin,
          y: Math.random() * GRID_CONFIG.GRID_HEIGHT,
        };

      case 2:
        return {
          x: Math.random() * GRID_CONFIG.GRID_WIDTH,
          y: WORLD_SIZE.HEIGHT + margin,
        };

      case 3:
      default:
        return {
          x: -margin,
          y: Math.random() * GRID_CONFIG.GRID_HEIGHT,
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

  // Shamelessly put together from pieces, apparently this is called DDA (Digital Differential Analyzer)
  public raycastShot(from: WorldPosition, angleRad: number, maxDistance: number): null | GridTileRef {
    const MAX_RANGE = 100;

    const direction = radiansToVector(angleRad);
    const startGrid = worldToGrid({ x: from.x, y: from.y });
    const currentLevelGrid = this.fillLevelGrid();

    const stepX = direction.x > 0 ? 1 : -1;
    const stepY = direction.y > 0 ? 1 : -1;

    const deltaDistX = Math.abs(1 / direction.x);
    const deltaDistY = Math.abs(1 / direction.y);

    let tMaxX = Math.abs((startGrid.x + (stepX > 0 ? 1 : 0) - from.x / GRID_CONFIG.TILE_SIZE) / direction.x);
    let tMaxY = Math.abs((startGrid.y + (stepY > 0 ? 1 : 0) - from.y / GRID_CONFIG.TILE_SIZE) / direction.y);

    let currentX = startGrid.x;
    let currentY = startGrid.y;
    let raycastHit: null | GridTileRef = null;

    for (let i = 0; i < MAX_RANGE; i++) {
      if (!this.isInsideGrid({ x: currentX, y: currentY })) break;

      // TODO: Check and damage entities that occupy the tile
      const { ref, state } = currentLevelGrid?.[currentX]?.[currentY] ?? { ref: null, state: GridTileState.AVAILABLE };
      if (state === GridTileState.BLOCKED) {
        raycastHit = ref;
        break;
      }

      // Next tile
      if (tMaxX < tMaxY) {
        tMaxX += deltaDistX;
        currentX += stepX;
      } else {
        tMaxY += deltaDistY;
        currentY += stepY;
      }
    }

    if (raycastHit && getVectorDistance(from, raycastHit.worldPos) > maxDistance) return null;
    return raycastHit;
  }

  private isInsideGrid(gridPos: GridPosition): boolean {
    return (
      gridPos.x >= 0 && gridPos.x <= GRID_CONFIG.GRID_WIDTH && gridPos.y >= 0 && gridPos.y <= GRID_CONFIG.GRID_HEIGHT
    );
  }

  private generateEmptyLevelGrid(): LevelGrid {
    const levelGrid: LevelGrid = [];
    for (let x = 0; x < GRID_CONFIG.GRID_WIDTH; x++) {
      const columns: LevelGrid[number] = [];
      for (let y = 0; y < GRID_CONFIG.GRID_HEIGHT; y++) {
        columns.push({ state: GridTileState.AVAILABLE, ref: null });
      }
      levelGrid.push(columns);
    }
    return levelGrid;
  }

  // WARN: THIS IS MOST PROBABLY NOT A GOOD IDEA LONG-TERM
  // Entities could call grid update by reference and perform calculations only if needed
  private fillLevelGrid(): LevelGrid {
    const grid = this.generateEmptyLevelGrid();

    const playerGridPos = this.player.gridPos;
    grid[playerGridPos.x][playerGridPos.y] = { state: GridTileState.PLAYER, ref: this.player };

    for (const zombie of this.zombies) {
      grid[zombie.gridPos.x][zombie.gridPos.y] = { state: GridTileState.BLOCKED, ref: zombie };
    }

    for (const block of this.blocks) {
      grid[block.gridPos.x][block.gridPos.y] = { state: GridTileState.BLOCKED, ref: block };
    }

    // TODO: Blocks, map tiles

    return grid;
  }

  public destroyEntity(ref: AEntity, type: "block" | "zombie"): void {
    let entityList: Zombie[] | BlockWood[] | undefined = undefined;
    if (type === "block") entityList = this.blocks;
    if (type === "zombie") entityList = this.zombies;
    if (!entityList) return;

    const index = entityList.findIndex((entityRef) => entityRef === ref);
    if (index === -1) return;
    entityList.splice(index);
  }
}
