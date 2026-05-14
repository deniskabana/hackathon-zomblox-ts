import {
  WORLD_SIZE,
  setGridConfig,
  GRID_CONFIG,
  type GridPosition,
  type WorldPosition,
} from "../config/core/grid.config";
import type { AnyEntity } from "../entities/engine/AEntity";
import BlockBarrelFire from "../entities/game/blocks/BlockBarrelFire";
import BlockWood from "../entities/game/blocks/BlockWood";
import Coin from "../entities/game/collectables/Coin";
import Zombie from "../entities/game/enemies/Zombie";
import Player from "../entities/game/player/Player";
import type GameInstance from "../GameInstance";
import MapTilesetManager from "../map/MapTilesetManager";
import type { GameMap } from "../map/parseJsonMap";
import parseJsonMap from "../map/parseJsonMap";
import type { AudioControl } from "../types/AudioControl";
import { type LevelGrid, GridTileState, type GridTileRef } from "../types/engine/Grid";
import type { LevelState } from "../types/LevelState";
import { ZIndex } from "../types/lib/ZIndex";
import assertNever from "../utils/assertNever";
import generateEmptyLevelGrid from "../utils/grid/generateEmptyLevelGrid";
import generateFlowField, { type FlowField } from "../utils/grid/generateFlowFieldMap";
import raycast2D from "../utils/grid/raycast2D";
import areVectorsEqual from "../utils/math/areVectorsEqual";
import { AManager } from "./abstract/AManager";
import { BlockTypes } from "./BuildModeManager";
import { EntityType } from "./engine/EntityManager";

export default class LevelManager extends AManager {
  public worldWidth: number = WORLD_SIZE.WIDTH;
  public worldHeight: number = WORLD_SIZE.HEIGHT;
  public levelState?: LevelState;

  // Grids
  public levelGrid?: LevelGrid;
  public flowField?: FlowField;
  public weightedFlowField?: FlowField;
  public retreatFlowFields?: FlowField[];
  public enemyGrid?: (Zombie[] | null)[][];

  // Map data
  private tileLayers?: GameMap["tileLayers"];
  private tileset?: MapTilesetManager;
  private mapLayerBelowPlayer!: HTMLCanvasElement;
  private mapLayerAbovePlayer!: HTMLCanvasElement;
  private mapSpawnPoints: WorldPosition[];

  // Entities
  public player?: Player;
  // private playerLastGridPos?: GridPosition;

  // Gameplay
  private isSpawningZombies: boolean = false;
  private zombieSpawnsLeft: number = 0;

  // Music
  private musicDay: AudioControl[] = [];
  private musicNight: AudioControl[] = [];

  // Timers
  private nightEndCounter: number = 0;
  private spawnTimer: number = 0;
  private zombieSpawnInterval: number = 0.4;

  constructor(gameInstance: GameInstance) {
    super(gameInstance);
    this.mapLayerBelowPlayer = document.createElement("canvas");
    this.mapLayerAbovePlayer = document.createElement("canvas");
    this.mapSpawnPoints = [];
  }

  public _init(): void {
    const { SettingsManager } = this.gameInstance.MANAGERS;
    const settings = SettingsManager.getSettings();

    const { map, config } = parseJsonMap();
    setGridConfig(config);

    this.worldWidth = config.TILE_SIZE * config.GRID_WIDTH;
    this.worldHeight = config.TILE_SIZE * config.GRID_HEIGHT;

    const tilesetImage = this.gameInstance.MANAGERS.AssetManager.getImageAsset("TMapTilesetDemo");
    if (!tilesetImage) throw new Error("Tileset image not loaded");
    this.tileset = new MapTilesetManager(tilesetImage, config.TILE_SIZE);
    this.tileLayers = map.tileLayers;

    this.player = this.gameInstance.MANAGERS.EntityManager.createEntity<Player>(
      EntityType.PLAYER,
      (entityId) => new Player({ gridPos: map.spawn, entityId, gameInstance: this.gameInstance }),
    );

    this.levelState = {
      phase: "day",
      daysCounter: 0,
      currencyTotalCounter: 0,
      zombiesKillCounter: 0,
      currency: settings.rules.startingCurrency,
      totalTimeCounter: 0,
    };
    this.mapLayerBelowPlayer.width = GRID_CONFIG.GRID_WIDTH * GRID_CONFIG.TILE_SIZE;
    this.mapLayerBelowPlayer.height = GRID_CONFIG.GRID_HEIGHT * GRID_CONFIG.TILE_SIZE;
    this.mapLayerAbovePlayer.width = GRID_CONFIG.GRID_WIDTH * GRID_CONFIG.TILE_SIZE;
    this.mapLayerAbovePlayer.height = GRID_CONFIG.GRID_HEIGHT * GRID_CONFIG.TILE_SIZE;
    this.createMapTileImages();

    this.levelGrid = generateEmptyLevelGrid(config, map.objects);
    this.updatePathFindingGrid();

    // Filter out spawn points that have BLOCKED neighboring cell
    const yTop = 0;
    const yBottom = GRID_CONFIG.GRID_HEIGHT - 1;
    const xLeft = 0;
    const xRight = GRID_CONFIG.GRID_WIDTH - 1;

    for (let x = 0; x < GRID_CONFIG.GRID_WIDTH; x++) {
      if (
        this.levelGrid?.[x]?.[yTop + 1]?.state === GridTileState.AVAILABLE &&
        this.flowField?.[x]?.[yTop + 1]?.weight !== Infinity
      ) {
        this.mapSpawnPoints.push({ x, y: yTop });
      }
      if (
        this.levelGrid?.[x]?.[yBottom - 1]?.state === GridTileState.AVAILABLE &&
        this.flowField?.[x]?.[yBottom - 2]?.weight !== Infinity
      ) {
        this.mapSpawnPoints.push({ x, y: yBottom });
      }
    }

    for (let y = 0; y < GRID_CONFIG.GRID_HEIGHT; y++) {
      if (
        this.levelGrid?.[xLeft + 1]?.[y]?.state === GridTileState.AVAILABLE &&
        this.flowField?.[xLeft + 1]?.[y]?.weight !== Infinity
      ) {
        this.mapSpawnPoints.push({ x: xLeft, y });
      }
      if (
        this.levelGrid?.[xRight - 1]?.[y]?.state === GridTileState.AVAILABLE &&
        this.flowField?.[xRight - 1]?.[y]?.weight !== Infinity
      ) {
        this.mapSpawnPoints.push({ x: xRight, y });
      }
    }
  }

  public update(_deltaTime: number) {
    if (!this.player) return;
    if (this.player && this.levelState) this.levelState.totalTimeCounter += _deltaTime;

    this.applyZombieSpawn(_deltaTime);
    this.updateEnemyGrid();

    this.updatePathFindingGrid();

    if (!this.getIsDay() && !!this.player) {
      this.nightEndCounter -= _deltaTime;
      if (this.nightEndCounter <= 0) this.startDay();
    }
  }

  public drawEntities(): void {
    const { DrawManager, CameraManager, SettingsManager, EntityManager } = this.gameInstance.MANAGERS;

    this.drawMapLayers("below", SettingsManager.getSettings().rules.debugDrawFlowFieldGrid ? 0.75 : 1);

    if (SettingsManager.getSettings().rules.debugDrawFlowFieldGrid) {
      const size = GRID_CONFIG.TILE_SIZE;

      for (let x = 0; x < GRID_CONFIG.GRID_WIDTH; x++) {
        for (let y = 0; y < GRID_CONFIG.GRID_HEIGHT; y++) {
          if (!CameraManager.isOnScreen({ x: x * size, y: y * size })) continue;
          if (!this.player || areVectorsEqual(this.player._getGridPosition(), { x, y })) continue;

          if (this.levelGrid?.[x]?.[y]?.state !== GridTileState.AVAILABLE)
            DrawManager.drawRectFilled(x * size, y * size, size, size, "#800", 0.4);
          else DrawManager.drawRectOutline(x * size, y * size, size, size, "#fff", 0.1);

          if (this.flowField?.[x]?.[y]) {
            const currentFieldCell = this.flowField[x][y];
            const weight = currentFieldCell.weight;
            const vector = currentFieldCell.normalizedVector;
            if (weight === Infinity) continue;

            const cx = x * size + size / 2;
            const cy = y * size + size / 2;
            const half = size / 2;

            const x1 = cx - vector.x * half;
            const y1 = cy - vector.y * half;
            const x2 = cx + vector.x * half;
            const y2 = cy + vector.y * half;

            // Shaft
            DrawManager.drawLine(x1, y1, x2, y2, "#00000040", 4);
            DrawManager.drawLine(x1, y1, x2, y2, "#afcf8ff0", 2);

            // Arrow tip
            const tipLen = half * 0.5;
            const angle = Math.atan2(vector.y, vector.x);
            const spread = Math.PI * 0.75; // 135°

            for (const side of [-1, 1]) {
              const wingAngle = angle + spread * side;
              const wx = x2 + Math.cos(wingAngle) * tipLen;
              const wy = y2 + Math.sin(wingAngle) * tipLen;
              DrawManager.drawLine(x2, y2, wx, wy, "#00000040", 4);
              DrawManager.drawLine(x2, y2, wx, wy, "#afcf8ff0", 2);
            }

            DrawManager.drawText(
              `${weight}`,
              x * size + size / 2 + 1,
              y * size + size / 2 + 1,
              "#000000",
              12,
              "Arial",
              "center",
            );
            DrawManager.drawText(
              `${weight}`,
              x * size + size / 2,
              y * size + size / 2,
              "#ffffff",
              12,
              "Arial",
              "center",
            );
          }
        }
      }
    }

    EntityManager.draw();
    this.drawMapLayers("above", SettingsManager.getSettings().rules.debugDrawFlowFieldGrid ? 0.5 : 1);

    if (!this.getIsDay() && this.player) {
      this.gameInstance.MANAGERS.LightManager.drawNightLighting(
        [this.player._getWorldPosition()],
        this.player.getFacingDirection(),
      );
    }
  }

  private createMapTileImages(): void {
    if (!this.tileLayers || !this.tileset) return;

    this.mapLayerBelowPlayer
      .getContext("2d")
      ?.clearRect(0, 0, this.mapLayerBelowPlayer.width, this.mapLayerBelowPlayer.height);
    this.mapLayerAbovePlayer
      .getContext("2d")
      ?.clearRect(0, 0, this.mapLayerAbovePlayer.width, this.mapLayerAbovePlayer.height);

    this.renderMapLayerToCanvas(this.tileLayers.ground, this.mapLayerBelowPlayer);
    this.renderMapLayerToCanvas(this.tileLayers.groundDecor, this.mapLayerBelowPlayer);
    this.renderMapLayerToCanvas(this.tileLayers.overlay, this.mapLayerAbovePlayer);
    this.renderMapLayerToCanvas(this.tileLayers.overlayDecor, this.mapLayerAbovePlayer);
  }

  private drawMapLayers(position: "above" | "below", alpha: number = 1): void {
    if (!this.tileLayers || !this.tileset) return;

    this.gameInstance.MANAGERS.DrawManager.queueDraw(
      0,
      0,
      position === "above" ? this.mapLayerAbovePlayer : this.mapLayerBelowPlayer,
      GRID_CONFIG.GRID_WIDTH * GRID_CONFIG.TILE_SIZE,
      GRID_CONFIG.GRID_HEIGHT * GRID_CONFIG.TILE_SIZE,
      position === "above" ? ZIndex.MAP_OVERLAY : ZIndex.MAP_GROUND,
      0,
      alpha,
    );
  }

  private renderMapLayerToCanvas(layer: number[], canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.imageSmoothingQuality = "low";

    for (let y = 0; y <= GRID_CONFIG.GRID_HEIGHT; y++) {
      for (let x = 0; x <= GRID_CONFIG.GRID_WIDTH; x++) {
        const index = y * GRID_CONFIG.GRID_WIDTH + x;
        const tileId = layer[index];
        if (tileId === 0) continue;
        const tileData = this.tileset?.getTileFrame(tileId);
        if (!tileData) continue;
        const frameData = tileData.spriteSheet.getFrame(tileData.frameIndex);
        if (!frameData.frame) continue;

        ctx.save();
        ctx.drawImage(
          frameData.image,
          Math.floor(frameData.frame.x),
          Math.floor(frameData.frame.y),
          Math.ceil(frameData.frame.width),
          Math.ceil(frameData.frame.height),
          x * GRID_CONFIG.TILE_SIZE,
          y * GRID_CONFIG.TILE_SIZE,
          GRID_CONFIG.TILE_SIZE,
          GRID_CONFIG.TILE_SIZE,
        );
        ctx.restore();
      }
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
        if (this.levelState) this.levelState.zombiesKillCounter += 1;
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
    const { AssetManager, EntityManager } = this.gameInstance.MANAGERS;

    for (const track of this.musicDay) track.pause();
    for (const track of this.musicNight) track.pause();

    AssetManager.playAudioAsset("AMusicBackgroundDead", "music");
    this.player = undefined;
    for (const zombie of EntityManager.getEnemies()) zombie.startWaiting();
  }

  public spawnBlock(pos: GridPosition, type: BlockTypes = BlockTypes.Wood): void {
    const { EntityManager } = this.gameInstance.MANAGERS;

    EntityManager.createEntity(EntityType.BLOCK, (entityId) => {
      let entity: AnyEntity | undefined = undefined;

      switch (type) {
        case BlockTypes.Wood:
          entity = new BlockWood({ gridPos: pos, entityId, gameInstance: this.gameInstance });
          break;
        case BlockTypes.FireBarrel:
          entity = new BlockBarrelFire({ gridPos: pos, entityId, gameInstance: this.gameInstance });
          break;
        default:
          assertNever(type);
      }

      if (!entity) throw new Error("Failed to create an entity");

      if (this.levelGrid) {
        const { x, y } = pos;
        this.levelGrid[x][y] = { ...this.levelGrid[x][y], state: GridTileState.BLOCKED, ref: entity };
      }

      return entity;
    });

    this.updatePathFindingGrid();
  }

  private destroyBlock(entityId: number): void {
    const { EntityManager } = this.gameInstance.MANAGERS;

    const entity = EntityManager.findEntity(entityId);
    if (!entity) return;
    const { x, y } = entity._getGridPosition();
    EntityManager.destroyEntity(entityId);

    if (!this.levelGrid) return;

    this.levelGrid[x][y] = { ...this.levelGrid[x][y], state: GridTileState.AVAILABLE, ref: null };
    this.updatePathFindingGrid();
  }

  public spawnCoin(gridPos: GridPosition): void {
    const { EntityManager } = this.gameInstance.MANAGERS;
    EntityManager.createEntity(
      EntityType.COLLECTABLE,
      (entityId) => new Coin({ gameInstance: this.gameInstance, entityId, gridPos }),
    );
  }

  private destroyCoin(entityId: number): void {
    const { EntityManager } = this.gameInstance.MANAGERS;
    EntityManager.destroyEntity(entityId);
  }

  private destroyZombie(entityId: number): void {
    const { EntityManager } = this.gameInstance.MANAGERS;
    EntityManager.destroyEntity(entityId);
  }

  // Zombies
  // ==================================================

  private startSpawningZombies(): void {
    const { SettingsManager } = this.gameInstance.MANAGERS;
    if (!SettingsManager.getSettings().rules.autospawn) return;

    this.isSpawningZombies = true;
    this.zombieSpawnsLeft = 100;
  }

  public stopSpawningZombies(): void {
    this.isSpawningZombies = false;
    this.zombieSpawnsLeft = 0;
  }

  public applyZombieSpawn(_deltaTime: number): void {
    if (this.isSpawningZombies) this.spawnTimer += _deltaTime;
    if (this.spawnTimer > this.zombieSpawnInterval) {
      this.spawnTimer = 0;

      if (this.zombieSpawnsLeft <= 0) return;
      this.spawnZombie();
    }
  }

  public spawnZombie(): Zombie | undefined {
    const { EntityManager } = this.gameInstance.MANAGERS;

    return EntityManager.createEntity(
      EntityType.ENEMY,
      (entityId) =>
        new Zombie({ gameInstance: this.gameInstance, entityId, gridPos: this.getRandomZombieSpawnPosition() }),
    );
  }

  private getRandomZombieSpawnPosition(): WorldPosition {
    return this.mapSpawnPoints[Math.floor(Math.random() * this.mapSpawnPoints.length)] || { x: 0, y: 0 };
    // const result = this.mapSpawnPoints[Math.floor(Math.random() * this.mapSpawnPoints.length)] || { x: 0, y: 0 };
    // return { x: clamp(1, result.x, GRID_CONFIG.GRID_WIDTH - 2), y: clamp(1, result.y, GRID_CONFIG.GRID_HEIGHT - 2) };
  }

  // Day and night
  // ==================================================

  public startGame(): void {
    this.startDay();
  }

  public startNight(): void {
    if (!this.levelState) return;
    const { EntityManager } = this.gameInstance.MANAGERS;

    this.gameInstance.MANAGERS.BuildModeManager.setBuildMode(false);
    this.retreatFlowFields = undefined;
    this.levelState.phase = "night";

    for (const zombie of EntityManager.getEnemies()) zombie.startChasingPlayer();

    const gameSettings = this.gameInstance.MANAGERS.SettingsManager.getSettings().rules;
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

    this.updatePathFindingGrid();
  }

  public startDay(): void {
    const { EntityManager } = this.gameInstance.MANAGERS;
    if (!this.levelState || !this.levelGrid) return;

    this.addCurrency(this.gameInstance.MANAGERS.SettingsManager.getSettings().rules.endNightReward);

    // this.retreatFlowFields = [];
    // const amount = Math.max(20, this.zombies.size);
    // for (let i = 0; i < amount; i++) {
    //   this.retreatFlowFields.push(
    //     generateFlowField(
    //       this.levelGrid,
    //       this.zombies,
    //       ...this.getRandomEdgePositions(),
    //       ...this.getRandomEdgePositions(),
    //     ),
    //   );
    // }
    //
    this.levelState.phase = "day";
    this.stopSpawningZombies();

    for (const zombie of EntityManager.getEnemies()) zombie.startRetreating();

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
    const { EntityManager } = this.gameInstance.MANAGERS;
    if (!this.levelGrid) return null;
    return raycast2D(from, angleRad, maxDistance, this.levelGrid, EntityManager.getEnemies());
  }

  private updatePathFindingGrid(): void {
    // if (this.getIsDay()) return;
    if (!this.player || !this.levelGrid) return;
    this.flowField = generateFlowField(this.levelGrid, this.enemyGrid, this.player._getGridPosition());
  }

  public _destroy(): void {
    this.stopSpawningZombies();
    this.player = undefined;
    this.mapLayerBelowPlayer.remove();
    this.mapLayerAbovePlayer.remove();
  }

  public addCurrency(amount: number = 1): void {
    if (!this.levelState) return;
    this.levelState.currency += amount;
    this.levelState.currencyTotalCounter += amount;
  }

  public getTileset(): MapTilesetManager | undefined {
    return this.tileset;
  }

  private updateEnemyGrid(): void {
    const { EntityManager } = this.gameInstance.MANAGERS;
    const grid: typeof this.enemyGrid = [];

    for (let x = 0; x < GRID_CONFIG.GRID_WIDTH; x++) {
      grid[x] = [];

      for (let y = 0; y < GRID_CONFIG.GRID_HEIGHT; y++) {
        grid[x][y] = [];
      }
    }

    for (const zombie of EntityManager.getEnemies()) {
      const { x: zx, y: zy } = zombie._getGridPosition();
      grid?.[zx]?.[zy]?.push(zombie);
    }

    this.enemyGrid = grid;
  }

  public getEnemyGrid(): typeof this.enemyGrid {
    return this.enemyGrid;
  }
}
