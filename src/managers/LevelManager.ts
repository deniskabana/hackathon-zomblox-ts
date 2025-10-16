import {
  GRID_CONFIG,
  gridToWorld,
  WORLD_SIZE,
  worldToGrid,
  type GridPosition,
  type WorldPosition,
} from "../config/gameGrid";
import BlockWood from "../entities/BlockWood";
import Player from "../entities/Player";
import Zombie from "../entities/Zombie";
import type GameInstance from "../GameInstance";
import { type LevelGrid, GridTileState, type GridTileRef } from "../types/Grid";
import type { LevelState } from "../types/LevelState";
import generateFlowField, { type FlowField } from "../utils/generateFlowFieldMap";
import getVectorDistance from "../utils/getVectorDistance";
import radiansToVector from "../utils/radiansToVector";
import { ZIndex } from "./DrawManager";

export default class LevelManager {
  private gameInstance: GameInstance;
  public worldWidth = WORLD_SIZE.WIDTH;
  public worldHeight = WORLD_SIZE.HEIGHT;
  public levelState: LevelState;
  public levelGrid: LevelGrid;
  public flowField?: FlowField;

  // Entities
  public player: Player;
  private lastPlayerGridPos: GridPosition = { x: -99, y: -99 };
  public zombies: Map<number, Zombie> = new Map();
  public blocks: Map<number, BlockWood> = new Map();
  private entityIdCounter: number = 0;

  // Gameplay
  private isSpawningZombies: boolean = false;
  private zombieSpawnInterval: number = 1200;
  private spawnTimer: number = 0;

  constructor(gameInstance: GameInstance) {
    this.gameInstance = gameInstance;
    this.player = new Player({ x: 2, y: 2 }, this.entityIdCounter++, this.gameInstance);
    this.lastPlayerGridPos = this.player.gridPos;

    // TODO: Remove, top-left
    this.spawnBlock({ x: 7, y: 4 });
    this.spawnBlock({ x: 6, y: 4 });
    this.spawnBlock({ x: 6, y: 5 });
    this.spawnBlock({ x: 6, y: 6 });
    this.spawnBlock({ x: 6, y: 7 });
    this.spawnBlock({ x: 6, y: 8 });
    this.spawnBlock({ x: 5, y: 8 });
    this.spawnBlock({ x: 4, y: 8 });
    this.spawnBlock({ x: 3, y: 8 });
    // TODO: Remove, top-right
    this.spawnBlock({ x: 10, y: 4 });
    this.spawnBlock({ x: 11, y: 4 });
    this.spawnBlock({ x: 12, y: 4 });
    this.spawnBlock({ x: 12, y: 3 });
    this.spawnBlock({ x: 12, y: 2 });
    this.spawnBlock({ x: 13, y: 2 });
    // TODO: Remove, center
    this.spawnBlock({ x: 9, y: 7 });
    this.spawnBlock({ x: 9, y: 8 });
    this.spawnBlock({ x: 9, y: 9 });
    this.spawnBlock({ x: 9, y: 10 });
    this.spawnBlock({ x: 10, y: 8 });
    this.spawnBlock({ x: 11, y: 8 });
    this.spawnBlock({ x: 12, y: 8 });
    this.spawnBlock({ x: 13, y: 8 });
    this.spawnBlock({ x: 13, y: 9 });
    this.spawnBlock({ x: 13, y: 10 });
    this.spawnBlock({ x: 13, y: 11 });
    this.spawnBlock({ x: 13, y: 12 });
    // TODO: Remove, bottom-left
    this.spawnBlock({ x: 5, y: 11 });
    this.spawnBlock({ x: 5, y: 12 });
    this.spawnBlock({ x: 5, y: 13 });
    this.spawnBlock({ x: 5, y: 14 });
    this.spawnBlock({ x: 5, y: 15 });
    this.spawnBlock({ x: 6, y: 13 });
    this.spawnBlock({ x: 7, y: 13 });
    // TODO: Remove, bottom-right
    this.spawnBlock({ x: 13, y: 16 });
    this.spawnBlock({ x: 14, y: 16 });
    this.spawnBlock({ x: 15, y: 16 });
    this.spawnBlock({ x: 15, y: 15 });
    this.spawnBlock({ x: 16, y: 15 });
    this.spawnBlock({ x: 16, y: 14 });
    this.spawnBlock({ x: 17, y: 14 });
    this.spawnBlock({ x: 17, y: 13 });

    this.levelState = { phase: "night", daysCounter: 0 };

    this.levelGrid = this.generateLevelGrid();
  }

  public update(_deltaTime: number) {
    this.player.update(_deltaTime);

    for (const zombie of this.zombies.values()) {
      zombie.update(_deltaTime);
    }

    if (this.isSpawningZombies) this.spawnTimer += _deltaTime;

    if (this.spawnTimer > this.zombieSpawnInterval / 1000) {
      this.spawnZombie();
      this.spawnTimer = 0;
    }

    if (
      !(this.lastPlayerGridPos.x === this.player.gridPos.x && this.lastPlayerGridPos.y === this.player.gridPos.y) ||
      !this.flowField
    ) {
      this.updatePathFindingGrid();
    }
  }

  public init(): void {
    this.startSpawningZombies();
  }

  public drawEntities(_deltaTime: number): void {
    this.player.draw(_deltaTime);

    for (const zombie of this.zombies.values()) zombie.draw();
    for (const block of this.blocks.values()) block.draw();

    this.levelGrid.forEach((gridRow, x) => {
      gridRow.forEach((_gridCol, y) => {
        const tileWorldPos = gridToWorld({ x, y });
        const texture = this.gameInstance.MANAGERS.AssetManager.getImageAsset("ITextureGround");
        if (!texture) return;

        const settings = this.gameInstance.MANAGERS.GameManager.getSettings();
        if (!settings.debug.enableFlowFieldRender) {
          this.gameInstance.MANAGERS.DrawManager.queueDraw(
            tileWorldPos.x,
            tileWorldPos.y,
            texture,
            GRID_CONFIG.TILE_SIZE,
            GRID_CONFIG.TILE_SIZE,
            ZIndex.GROUND,
          );
        } else {
          const distance = this.flowField?.[x][y].distance ?? 0;
          this.gameInstance.MANAGERS.DrawManager.drawText(
            String(distance),
            tileWorldPos.x + GRID_CONFIG.TILE_SIZE / 2,
            tileWorldPos.y + GRID_CONFIG.TILE_SIZE / 2,
            `rgb(${distance * 10}, ${205 - distance * 5}, 40)`,
            14,
            "Arial",
            "center",
          );
        }
      });
    });
  }

  public destroyEntity(entityId: number, type: "block" | "zombie"): void {
    let entityList: typeof this.blocks | typeof this.zombies | undefined = undefined;
    if (type === "zombie") entityList = this.zombies;
    if (type === "block") entityList = this.blocks;
    entityList?.delete(entityId);

    if (type === "block") this.updatePathFindingGrid();
  }

  // Blocks
  // ==================================================

  public spawnBlock(pos: GridPosition): void {
    const entityId = this.entityIdCounter++;
    this.blocks.set(entityId, new BlockWood(pos, entityId, this.gameInstance));
    if (this.zombies.size > 1) this.updatePathFindingGrid();
  }

  // Zombies
  // ==================================================

  private startSpawningZombies(): void {
    this.isSpawningZombies = true;
  }

  public stopSpawningZombies(): void {
    this.isSpawningZombies = false;
  }

  public spawnZombie(): void {
    if (this.zombies.size >= 100) return;
    const entityId = this.entityIdCounter++;
    this.zombies.set(entityId, new Zombie(this.getRandomZombieSpawnPosition(), entityId, this.gameInstance));
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
          x: GRID_CONFIG.GRID_WIDTH + margin,
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

  // Day and night
  // ==================================================

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

  // Grid :: Utils
  // ==================================================

  private generateLevelGrid(fillWithObjects: boolean = true): LevelGrid {
    const levelGrid: LevelGrid = [];
    for (let x = 0; x < GRID_CONFIG.GRID_WIDTH; x++) {
      const columns: LevelGrid[number] = [];
      for (let y = 0; y < GRID_CONFIG.GRID_HEIGHT; y++) {
        columns.push({ state: GridTileState.AVAILABLE, ref: null, pos: { x, y } });
      }
      levelGrid.push(columns);
    }

    if (!fillWithObjects) return levelGrid;

    const playerGridPos = this.player.gridPos;
    levelGrid[playerGridPos.x][playerGridPos.y] = {
      state: GridTileState.PLAYER,
      ref: this.player,
      pos: this.player.gridPos,
    };

    for (const block of this.blocks.values()) {
      levelGrid[block.gridPos.x][block.gridPos.y] = { state: GridTileState.BLOCKED, ref: block, pos: block.gridPos };
    }

    // TODO: Map tiles

    return levelGrid;
  }

  public isInsideGrid(gridPos: GridPosition): boolean {
    return (
      gridPos.x >= 0 && gridPos.x < GRID_CONFIG.GRID_WIDTH && gridPos.y >= 0 && gridPos.y < GRID_CONFIG.GRID_HEIGHT
    );
  }

  // Grid :: Raycasting
  // ==================================================

  /*
   * Raycasting
   * NOTE: Shamelessly put together from pieces, apparently this is called DDA (Digital Differential Analyzer)
   * This solution is not optimal but I lack the time and knowledge to make it better for an MVP
   */
  public raycastShot(from: WorldPosition, angleRad: number, maxDistance: number): null | GridTileRef {
    const MAX_RANGE = 100;

    const direction = radiansToVector(angleRad);
    const startGrid = worldToGrid({ x: from.x, y: from.y });

    const stepX = direction.x > 0 ? 1 : -1;
    const stepY = direction.y > 0 ? 1 : -1;

    const deltaDistX = Math.abs(1 / direction.x);
    const deltaDistY = Math.abs(1 / direction.y);

    let tMaxX = Math.abs((startGrid.x + (stepX > 0 ? 1 : 0) - from.x / GRID_CONFIG.TILE_SIZE) / direction.x);
    let tMaxY = Math.abs((startGrid.y + (stepY > 0 ? 1 : 0) - from.y / GRID_CONFIG.TILE_SIZE) / direction.y);

    let currentX = startGrid.x;
    let currentY = startGrid.y;
    let raycastHit: null | GridTileRef = null;

    const levelGridWithZombies = this.generateLevelGrid();

    for (const [_id, zombie] of this.zombies) {
      if (!this.isInsideGrid(zombie.gridPos)) continue;
      levelGridWithZombies[zombie.gridPos.x][zombie.gridPos.y].state = GridTileState.BLOCKED;
      levelGridWithZombies[zombie.gridPos.x][zombie.gridPos.y].ref = zombie;
    }

    for (let i = 0; i < MAX_RANGE; i++) {
      if (!this.isInsideGrid({ x: currentX, y: currentY })) break;

      const { ref, state } = levelGridWithZombies?.[currentX]?.[currentY] ?? { ref: null, state: GridTileState.AVAILABLE };
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

  // Grid :: Pathfinding
  // ==================================================

  private updatePathFindingGrid(): void {
    this.levelGrid = this.generateLevelGrid();
    this.lastPlayerGridPos = this.player.gridPos;
    this.flowField = generateFlowField(this.levelGrid, this.player.gridPos);
  }
}
