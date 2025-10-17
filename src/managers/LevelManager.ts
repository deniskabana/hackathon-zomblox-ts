import { GRID_CONFIG, gridToWorld, WORLD_SIZE, type GridPosition, type WorldPosition } from "../config/gameGrid";
import BlockWood from "../entities/BlockWood";
import Player from "../entities/Player";
import Zombie from "../entities/Zombie";
import type GameInstance from "../GameInstance";
import { type GridTileRef, type LevelGrid } from "../types/Grid";
import type { LevelState } from "../types/LevelState";
import { ZIndex } from "../types/ZIndex";
import fillLevelGrid from "../utils/grid/fillLevelGrid";
import generateEmptyLevelGrid from "../utils/grid/generateEmptyLevelGrid";
import generateFlowField, { type FlowField } from "../utils/grid/generateFlowFieldMap";
import raycast2D from "../utils/grid/raycast2D";
import areVectorsEqual from "../utils/math/areVectorsEqual";
import { AManager } from "./abstract/AManager";

export default class LevelManager extends AManager {
  public worldWidth = WORLD_SIZE.WIDTH;
  public worldHeight = WORLD_SIZE.HEIGHT;
  public levelState?: LevelState;
  public levelGrid?: LevelGrid;
  public flowField?: FlowField;

  // Entities
  public player?: Player;
  private lastPlayerGridPos: GridPosition = { x: -99, y: -99 };
  public zombies: Map<number, Zombie> = new Map();
  public blocks: Map<number, BlockWood> = new Map();
  private entityIdCounter: number = 0;

  // Gameplay
  private isSpawningZombies: boolean = false;
  private zombieSpawnInterval: number = 1200;
  private spawnTimer: number = 0;
  private zombieSpawnsLeft: number = 0;
  private nightEndCounter: number = 0;

  constructor(gameInstance: GameInstance) {
    super(gameInstance);
  }

  public update(_deltaTime: number) {
    this.player?.update(_deltaTime);
    for (const zombie of this.zombies.values()) zombie.update(_deltaTime);
    this.applyZombieSpawn(_deltaTime);

    const hasPlayerMoved = !this.player || !areVectorsEqual(this.lastPlayerGridPos, this.player.gridPos);
    if (hasPlayerMoved || !this.flowField) this.updatePathFindingGrid();

    if (this.levelState?.phase === "night") {
      this.nightEndCounter -= _deltaTime;
      if (this.nightEndCounter <= 0) this.startDay();
    }
  }

  public init(): void {
    this.player = new Player({ x: 2, y: 2 }, this.entityIdCounter++, this.gameInstance);
    this.lastPlayerGridPos = this.player.gridPos;

    const gameSettings = this.gameInstance.MANAGERS.GameManager.getSettings().rules.game;
    this.zombieSpawnInterval = gameSettings.zombieSpawnIntervalMs;
    this.levelState = { phase: gameSettings.startPhase, daysCounter: 1 };

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

    this.levelGrid = this.generateLevelGrid();
    this.startSpawningZombies();
  }

  public drawEntities(): void {
    this.player?.draw();

    for (const zombie of this.zombies.values()) zombie.draw();
    for (const block of this.blocks.values()) block.draw();

    // Render ground
    this.levelGrid?.forEach((gridRow, x) => {
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
          // Debug renderer (flow field distance map)
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
    const settings = this.gameInstance.MANAGERS.GameManager.getSettings().rules.game;
    this.isSpawningZombies = true;
    this.zombieSpawnsLeft = settings.zombieSpawnAmount;
  }

  public stopSpawningZombies(): void {
    this.isSpawningZombies = false;
    this.zombieSpawnsLeft = 0;
  }

  public applyZombieSpawn(_deltaTime: number): void {
    if (this.isSpawningZombies) this.spawnTimer += _deltaTime;
    if (this.spawnTimer > this.zombieSpawnInterval / 1000) {
      this.spawnTimer = 0;

      if (this.zombieSpawnsLeft <= 0) return;
      const entityId = this.entityIdCounter++;
      this.zombies.set(entityId, new Zombie(this.getRandomZombieSpawnPosition(), entityId, this.gameInstance));
      this.zombieSpawnsLeft--;
    }
  }

  private getRandomZombieSpawnPosition(margin: number = 2): WorldPosition {
    // NOTE: 0 = top, 1 = right, 2 = bottom, 3 = left
    switch (Math.floor(Math.random() * 4)) {
      default:
      case 0:
        return { x: Math.random() * GRID_CONFIG.GRID_WIDTH, y: -margin };
      case 1:
        return { x: GRID_CONFIG.GRID_WIDTH + margin, y: Math.random() * GRID_CONFIG.GRID_HEIGHT };
      case 2:
        return { x: Math.random() * GRID_CONFIG.GRID_WIDTH, y: WORLD_SIZE.HEIGHT + margin };
      case 3:
        return { x: -margin, y: Math.random() * GRID_CONFIG.GRID_HEIGHT };
    }
  }

  // Day and night
  // ==================================================

  public startNight() {
    if (!this.levelState || this.levelState?.phase === "night") return;
    this.levelState.phase = "night";
    // TODO: UI and game changes
  }

  public startDay() {
    if (!this.levelState || this.levelState?.phase === "day") return;
    this.levelState.phase = "day";
    this.levelState.daysCounter += 1;
    // TODO: UI and game changes
  }

  // Grid
  // ==================================================

  private generateLevelGrid(fillWithStaticObjects: boolean = true, fillWithZombies: boolean = false): LevelGrid {
    const levelGrid: LevelGrid = generateEmptyLevelGrid(GRID_CONFIG);
    if (!this.player) return levelGrid;
    fillLevelGrid(
      levelGrid,
      { player: fillWithStaticObjects, blocks: fillWithStaticObjects, zombies: fillWithZombies },
      { player: this.player, blocks: this.blocks, zombies: this.zombies },
    );
    return levelGrid;
  }

  public raycastShot(from: WorldPosition, angleRad: number, maxDistance: number): null | GridTileRef {
    const levelGrid = this.generateLevelGrid(true, true);
    return raycast2D(from, angleRad, maxDistance, levelGrid);
  }

  private updatePathFindingGrid(): void {
    this.levelGrid = this.generateLevelGrid();
    if (!this.player) return;
    this.lastPlayerGridPos = this.player.gridPos;
    this.flowField = generateFlowField(this.levelGrid, this.player.gridPos);
  }

  // Utils
  // ==================================================

  public destroy(): void {
    this.player = undefined;
    this.zombies.clear();
    this.blocks.clear();
  }
}
