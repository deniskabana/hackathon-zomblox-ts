import { GRID_CONFIG, gridToWorld, WORLD_SIZE, type GridPosition, type WorldPosition } from "../config/gameGrid";
import BlockWood from "../entities/BlockWood";
import Coin from "../entities/Coin";
import Fire from "../entities/Fire";
import Player from "../entities/Player";
import Zombie from "../entities/Zombie";
import type GameInstance from "../GameInstance";
import type { AudioControl } from "../types/AudioControl";
import { EntityType } from "../types/EntityType";
import { GridTileState, type GridTileRef, type LevelGrid } from "../types/Grid";
import type { LevelState } from "../types/LevelState";
import { ZIndex } from "../types/ZIndex";
import assertNever from "../utils/assertNever";
import generateEmptyLevelGrid from "../utils/grid/generateEmptyLevelGrid";
import generateFlowField, { type FlowField } from "../utils/grid/generateFlowFieldMap";
import raycast2D from "../utils/grid/raycast2D";
import areVectorsEqual from "../utils/math/areVectorsEqual";
import { AManager } from "./abstract/AManager";

export default class LevelManager extends AManager {
  public worldWidth = WORLD_SIZE.WIDTH;
  public worldHeight = WORLD_SIZE.HEIGHT;
  public levelState?: LevelState;
  private entityIdCounter: number = 0;

  // Grids
  public levelGrid?: LevelGrid;
  public flowField?: FlowField;
  public retreatFlowFields?: FlowField[];

  // Entities
  public player?: Player;
  public zombies: Map<number, Zombie> = new Map();
  public blocks: Map<number, BlockWood> = new Map();
  public collectables: Map<number, Coin> = new Map();

  // Gameplay
  private lastPlayerGridPos: GridPosition = { x: -99, y: -99 };
  private isSpawningZombies: boolean = false;
  private zombieSpawnsLeft: number = 0;

  // Music
  private musicDay: AudioControl[] = [];
  private musicNight: AudioControl[] = [];

  // Timers
  private nightEndCounter: number = 0;
  private spawnTimer: number = 0;
  private zombieSpawnInterval: number = 1200;

  private testLightSource: Fire | undefined;

  constructor(gameInstance: GameInstance) {
    super(gameInstance);
  }

  public init(): void {
    this.player = new Player({ x: 2, y: 2 }, this.entityIdCounter++, this.gameInstance);
    this.lastPlayerGridPos = this.player.gridPos;
    this.levelGrid = generateEmptyLevelGrid(GRID_CONFIG);

    const gameSettings = this.gameInstance.MANAGERS.GameManager.getSettings().rules.game;
    this.zombieSpawnInterval = gameSettings.zombieSpawnIntervalMs;
    this.levelState = { phase: "day", daysCounter: 0 };

    this.spawnCoin({ x: 3, y: 4 });

    this.testLightSource = new Fire({ x: 6, y: 5 }, -1, this.gameInstance);

    // TODO: Remove, top-left
    this.spawnBlock({ x: 8, y: 2 });
    this.spawnBlock({ x: 7, y: 2 });
    this.spawnBlock({ x: 6, y: 7 });
    this.spawnBlock({ x: 6, y: 8 });
    this.spawnBlock({ x: 4, y: 8 });
    this.spawnBlock({ x: 3, y: 8 });
    this.spawnBlock({ x: 3, y: 9 });
    this.spawnBlock({ x: 3, y: 10 });
    this.spawnBlock({ x: 4, y: 10 });
    // TODO: Remove, top-center
    this.spawnBlock({ x: 10, y: 4 });
    this.spawnBlock({ x: 11, y: 4 });
    this.spawnBlock({ x: 12, y: 4 });
    this.spawnBlock({ x: 12, y: 2 });
    this.spawnBlock({ x: 13, y: 2 });
    this.spawnBlock({ x: 14, y: 2 });
    // TODO: Remove, top-right
    this.spawnBlock({ x: 15, y: 2 });
    this.spawnBlock({ x: 17, y: 2 });
    this.spawnBlock({ x: 18, y: 2 });
    this.spawnBlock({ x: 19, y: 2 });
    this.spawnBlock({ x: 20, y: 3 });
    this.spawnBlock({ x: 20, y: 4 });
    this.spawnBlock({ x: 21, y: 4 });
    this.spawnBlock({ x: 21, y: 5 });
    this.spawnBlock({ x: 22, y: 5 });
    this.spawnBlock({ x: 23, y: 10 });
    // TODO: Remove, center
    this.spawnBlock({ x: 9, y: 7 });
    this.spawnBlock({ x: 9, y: 8 });
    this.spawnBlock({ x: 9, y: 9 });
    this.spawnBlock({ x: 9, y: 10 });
    this.spawnBlock({ x: 8, y: 10 });
    this.spawnBlock({ x: 7, y: 10 });
    this.spawnBlock({ x: 10, y: 8 });
    this.spawnBlock({ x: 11, y: 8 });
    this.spawnBlock({ x: 12, y: 8 });
    this.spawnBlock({ x: 13, y: 7 });
    this.spawnBlock({ x: 15, y: 5 });
    this.spawnBlock({ x: 15, y: 6 });
    this.spawnBlock({ x: 15, y: 7 });
    this.spawnBlock({ x: 14, y: 7 });
    // TODO: Remove, bottom-left
    this.spawnBlock({ x: 5, y: 11 });
    this.spawnBlock({ x: 5, y: 12 });
    this.spawnBlock({ x: 5, y: 13 });
    this.spawnBlock({ x: 5, y: 14 });
    this.spawnBlock({ x: 5, y: 15 });
    this.spawnBlock({ x: 6, y: 15 });
    this.spawnBlock({ x: 7, y: 15 });
    this.spawnBlock({ x: 8, y: 15 });
    this.spawnBlock({ x: 9, y: 15 });
    this.spawnBlock({ x: 9, y: 17 });
    // TODO: Remove, bottom-right
    this.spawnBlock({ x: 13, y: 16 });
    this.spawnBlock({ x: 18, y: 13 });
    this.spawnBlock({ x: 20, y: 10 });
    this.spawnBlock({ x: 20, y: 9 });
    this.spawnBlock({ x: 20, y: 8 });
    this.spawnBlock({ x: 17, y: 11 });
  }

  public update(_deltaTime: number) {
    this.player?.update(_deltaTime);
    this.testLightSource?.update(_deltaTime);

    for (const zombie of this.zombies.values()) zombie.update(_deltaTime);
    for (const coin of this.collectables.values()) coin.update(_deltaTime);

    this.applyZombieSpawn(_deltaTime);

    const hasPlayerMoved = !this.player || !areVectorsEqual(this.lastPlayerGridPos, this.player.gridPos);
    if (hasPlayerMoved || !this.flowField) this.updatePathFindingGrid();

    if (!this.getIsDay() && !!this.player) {
      this.nightEndCounter -= _deltaTime;
      if (this.nightEndCounter <= 0) this.startDay();
    }
  }

  public drawEntities(): void {
    this.player?.draw();
    this.testLightSource?.draw();

    for (const zombie of this.zombies.values()) zombie.draw();
    for (const block of this.blocks.values()) block.draw();
    for (const coin of this.collectables.values()) coin.draw();

    // Render ground
    this.levelGrid?.forEach((gridRow, x) => {
      gridRow.forEach((_gridCol, y) => {
        if (!this.gameInstance.MANAGERS.CameraManager.isOnScreen(gridToWorld({ x, y }))) return;
        if (this.levelGrid?.[x]?.[y]?.state !== GridTileState.AVAILABLE) return;

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
          let distance = 0;
          if (this.retreatFlowFields) distance = this.retreatFlowFields[0]?.[x][y].distance ?? 0;
          else distance = this.flowField?.[x][y].distance ?? 0;
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

    if (!this.getIsDay() && this.player) {
      this.gameInstance.MANAGERS.LightManager.drawNightLighting(
        [this.player.worldPos],
        this.player.getFacingDirection(),
        this.blocks,
        this.testLightSource?.worldPos ? [this.testLightSource?.worldPos] : undefined,
      );
    }
  }

  public destroyEntity(entityId: number, type: EntityType): void {
    switch (type) {
      case EntityType.BLOCK:
        this.destroyBlock(entityId);
        break;
      case EntityType.COLLECTABLE:
        this.destroyCoin(entityId);
        break;
      case EntityType.ENEMY:
        this.destroyZombie(entityId);
        break;
      case EntityType.PLAYER:
        this.destroyPlayer();
        break;
      default:
        assertNever(type);
    }
  }

  // Entities :: Spawn / destroy
  // ==================================================

  private destroyPlayer(): void {
    this.player = undefined;
    for (const [_id, zombie] of this.zombies) zombie.startWandering();
  }

  public spawnBlock(pos: GridPosition): void {
    const entityId = this.entityIdCounter++;
    const entity = new BlockWood(pos, entityId, this.gameInstance);
    this.blocks.set(entityId, entity);
    if (!this.levelGrid) return;
    const { x, y } = pos;
    this.levelGrid[x][y] = { ...this.levelGrid[x][y], state: GridTileState.BLOCKED, ref: entity };
    this.updatePathFindingGrid();
  }

  private destroyBlock(entityId: number): void {
    const entity = this.blocks.get(entityId);
    if (!entity) return;
    this.blocks.delete(entityId);
    if (!this.levelGrid) return;
    const { x, y } = entity.gridPos;
    this.levelGrid[x][y] = { ...this.levelGrid[x][y], state: GridTileState.AVAILABLE, ref: null };
    this.updatePathFindingGrid();
  }

  public spawnCoin(pos: GridPosition): void {
    const entityId = this.entityIdCounter++;
    this.collectables.set(entityId, new Coin(pos, entityId, this.gameInstance));
  }

  private destroyCoin(entityId: number): void {
    const entity = this.collectables.get(entityId);
    if (!entity) return;
    this.collectables.delete(entityId);
  }

  private destroyZombie(entityId: number): void {
    const entity = this.zombies.get(entityId);
    if (!entity) return;
    this.zombies.delete(entityId);
  }

  // Zombies
  // ==================================================

  private startSpawningZombies(): void {
    const settings = this.gameInstance.MANAGERS.GameManager.getSettings().rules.game;
    this.isSpawningZombies = true;
    this.zombieSpawnsLeft = settings.zombieSpawnAmount;

    for (let i = 0; i < settings.startZombiesAmount; i++) {
      if (this.zombieSpawnsLeft <= 0) return;
      const entityId = this.entityIdCounter++;
      this.zombies.set(entityId, new Zombie(this.getRandomZombieSpawnPosition(), entityId, this.gameInstance));
      this.zombieSpawnsLeft--;
    }
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
        return { x: Math.random() * (GRID_CONFIG.GRID_WIDTH - 1), y: -margin };
      case 1:
        return { x: GRID_CONFIG.GRID_WIDTH - 1 + margin, y: Math.random() * (GRID_CONFIG.GRID_HEIGHT - 1) };
      case 2:
        return { x: Math.random() * (GRID_CONFIG.GRID_WIDTH - 1), y: GRID_CONFIG.GRID_HEIGHT - 1 + margin };
      case 3:
        return { x: -margin, y: Math.random() * (GRID_CONFIG.GRID_HEIGHT - 1) };
    }
  }

  // Day and night
  // ==================================================

  public startGame(): void {
    this.startDay();
  }

  public startNight(): void {
    if (!this.levelState) return;
    this.player?.endBuildingMode();
    this.retreatFlowFields = undefined;
    this.levelState.phase = "night";

    this.updatePathFindingGrid();
    for (const [_, zombie] of this.zombies) zombie.startChasingPlayer();

    const gameSettings = this.gameInstance.MANAGERS.GameManager.getSettings().rules.game;
    this.nightEndCounter = gameSettings.nightDurationSec;
    this.startSpawningZombies();

    if (!this.musicNight.length) {
      const musicNight = this.gameInstance.MANAGERS.AssetManager.playAudioAsset(
        "AMusicBackgroundNight",
        "music",
        0.7,
        true,
        false,
      );
      if (musicNight) this.musicNight.push(musicNight);

      const ambienceNight = this.gameInstance.MANAGERS.AssetManager.playAudioAsset(
        "AFXZombieAmbience",
        "music",
        0.35,
        true,
        false,
      );
      if (ambienceNight) this.musicNight.push(ambienceNight);
    }

    for (const track of this.musicDay) track.pause();
    for (const track of this.musicNight) track.resume();
  }

  public startDay(): void {
    if (!this.levelState || !this.levelGrid) return;

    this.retreatFlowFields = [];
    const amount = Math.max(20, this.zombies.size);
    for (let i = 0; i < amount; i++) {
      this.retreatFlowFields.push(
        generateFlowField(this.levelGrid, ...this.getRandomEdgePositions(), ...this.getRandomEdgePositions()),
      );
    }

    this.levelState.phase = "day";
    this.stopSpawningZombies();

    for (const [_, zombie] of this.zombies) zombie.startRetreating();

    if (!this.musicDay.length) {
      const musicDay = this.gameInstance.MANAGERS.AssetManager.playAudioAsset(
        "AMusicBackgroundDay",
        "music",
        0.6,
        true,
        false,
      );
      if (musicDay) this.musicDay.push(musicDay);
    }

    if (this.levelState.daysCounter > 0)
      this.gameInstance.MANAGERS.AssetManager.playAudioAsset("AFXMorningRooster", "sound", 0.35);

    for (const track of this.musicDay) track.resume();
    for (const track of this.musicNight) track.pause();

    this.levelState.daysCounter += 1;
  }

  public getIsDay(): boolean {
    return this.levelState?.phase === "day";
  }

  // Grid
  // ==================================================

  public raycastShot(from: WorldPosition, angleRad: number, maxDistance: number): null | GridTileRef {
    if (!this.levelGrid) return null;
    return raycast2D(from, angleRad, maxDistance, this.levelGrid, this.zombies);
  }

  private updatePathFindingGrid(): void {
    if (this.getIsDay()) return;
    if (!this.player || !this.levelGrid) return;
    this.lastPlayerGridPos = this.player.gridPos;
    this.flowField = generateFlowField(this.levelGrid, this.player.gridPos);
  }

  // Utils
  // ==================================================

  private getRandomEdgePositions(): GridPosition[] {
    return [
      // Top edge
      { x: Math.floor(GRID_CONFIG.GRID_WIDTH * Math.random()), y: 0 },
      // Bottom edge
      { x: Math.floor(GRID_CONFIG.GRID_WIDTH * Math.random()), y: GRID_CONFIG.GRID_HEIGHT - 1 },
      // Left edge
      { x: 0, y: Math.floor(GRID_CONFIG.GRID_HEIGHT * Math.random()) },
      // Right edge
      { x: GRID_CONFIG.GRID_WIDTH - 1, y: Math.floor(GRID_CONFIG.GRID_HEIGHT * Math.random()) },
    ];
  }

  public destroy(): void {
    this.stopSpawningZombies();
    for (const track of this.musicDay) track.pause();
    for (const track of this.musicNight) track.pause();

    this.player = undefined;
    this.zombies.clear();
    this.blocks.clear();
    this.collectables.clear();
  }
}
