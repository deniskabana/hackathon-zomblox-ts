import {
  WORLD_SIZE,
  setGridConfig,
  GRID_CONFIG,
  type GridPosition,
  type WorldPosition,
} from "../config/core/grid.config";
import type ABlock from "../entities/abstract/ABlock";
import type ACollectable from "../entities/abstract/ACollectable";
import BlockBarrelFire from "../entities/blocks/BlockBarrelFire";
import BlockWood from "../entities/blocks/BlockWood";
import Coin from "../entities/collectables/Coin";
import Zombie from "../entities/enemies/Zombie";
import Player from "../entities/players/Player";
import type GameInstance from "../GameInstance";
import MapTilesetManager from "../map/MapTilesetManager";
import type { GameMap } from "../map/parseJsonMap";
import parseJsonMap from "../map/parseJsonMap";
import type { AudioControl } from "../types/AudioControl";
import { EntityType } from "../types/EntityType";
import { GridTileState, type GridTileRef, type LevelGrid } from "../types/Grid";
import type { LevelState } from "../types/LevelState";
import { ZIndex } from "../types/ZIndex";
import assertNever from "../utils/assertNever";
import generateEmptyLevelGrid from "../utils/grid/generateEmptyLevelGrid";
import generateFlowField, { type FlowField } from "../utils/grid/generateFlowFieldMap";
import raycast2D from "../utils/grid/raycast2D";
// import areVectorsEqual from "../utils/math/areVectorsEqual";
import { AManager } from "./abstract/AManager";
import { BlockTypes } from "./BuildModeManager";

export default class LevelManager extends AManager {
  public worldWidth: number = WORLD_SIZE.WIDTH;
  public worldHeight: number = WORLD_SIZE.HEIGHT;
  public levelState?: LevelState;
  private entityIdCounter: number = 0;

  // Grids
  public levelGrid?: LevelGrid;
  public flowField?: FlowField;
  public retreatFlowFields?: FlowField[];

  // Map data
  private tileLayers?: GameMap["tileLayers"];
  private tileset?: MapTilesetManager;
  private mapLayerBelowPlayer!: HTMLCanvasElement;
  private mapLayerAbovePlayer!: HTMLCanvasElement;
  private mapSpawnPoints: WorldPosition[];

  // Entities
  public player?: Player;
  public zombies: Map<number, Zombie> = new Map();
  public blocks: Map<number, ABlock> = new Map();
  public collectables: Map<number, ACollectable> = new Map();

  // Gameplay
  // private lastPlayerGridPos: GridPosition = { x: -99, y: -99 };
  private isSpawningZombies: boolean = false;
  private zombieSpawnsLeft: number = 0;

  // Music
  private musicDay: AudioControl[] = [];
  private musicNight: AudioControl[] = [];

  // Timers
  private nightEndCounter: number = 0;
  private spawnTimer: number = 0;
  private zombieSpawnInterval: number = 1200;
  private pathfindingStaleTimer: number = 0;
  private readonly pathfindingStaleAmountSec: number = 1 / 3;

  constructor(gameInstance: GameInstance) {
    super(gameInstance);
    this.mapLayerBelowPlayer = document.createElement("canvas");
    this.mapLayerAbovePlayer = document.createElement("canvas");
    this.mapSpawnPoints = [];
  }

  public init(): void {
    const { map, config } = parseJsonMap();
    setGridConfig(config);

    this.worldWidth = config.TILE_SIZE * config.GRID_WIDTH;
    this.worldHeight = config.TILE_SIZE * config.GRID_HEIGHT;

    const tilesetImage = this.gameInstance.MANAGERS.AssetManager.getImageAsset("TMapTilesetDemo");
    if (!tilesetImage) throw new Error("Tileset image not loaded");
    this.tileset = new MapTilesetManager(tilesetImage, config.TILE_SIZE);
    this.tileLayers = map.tileLayers;

    this.levelGrid = generateEmptyLevelGrid(config, map.objects);

    this.player = new Player(map.spawn, this.entityIdCounter++, this.gameInstance);
    // this.lastPlayerGridPos = this.player.gridPos;

    const gameSettings = this.gameInstance.MANAGERS.GameManager.getSettings().rules.game;
    this.zombieSpawnInterval = Math.min(
      gameSettings.zombieSpawnIntervalMs,
      (gameSettings.nightDurationSec * 1000) / this.zombieSpawnsLeft,
    );
    this.levelState = {
      phase: "day",
      daysCounter: 0,
      currencyTotalCounter: 0,
      zombiesKillCounter: 0,
      currency: gameSettings.startCurrency,
      totalTimeCounter: 0,
    };
    this.mapLayerBelowPlayer.width = GRID_CONFIG.GRID_WIDTH * GRID_CONFIG.TILE_SIZE;
    this.mapLayerBelowPlayer.height = GRID_CONFIG.GRID_HEIGHT * GRID_CONFIG.TILE_SIZE;
    this.mapLayerAbovePlayer.width = GRID_CONFIG.GRID_WIDTH * GRID_CONFIG.TILE_SIZE;
    this.mapLayerAbovePlayer.height = GRID_CONFIG.GRID_HEIGHT * GRID_CONFIG.TILE_SIZE;
    this.createMapTileImages();
    this.updatePathFindingGrid();

    // Filter out spawn points that have BLOCKED neighboring cell
    const yTop = -1;
    const yBottom = GRID_CONFIG.GRID_HEIGHT;
    const xLeft = -1;
    const xRight = GRID_CONFIG.GRID_HEIGHT;

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
    this.player?.update(_deltaTime);
    if (this.player && this.levelState) this.levelState.totalTimeCounter += _deltaTime;

    for (const zombie of this.zombies.values()) zombie.update(_deltaTime);
    for (const block of this.blocks.values()) block.update(_deltaTime);
    for (const coin of this.collectables.values()) coin.update(_deltaTime);

    this.applyZombieSpawn(_deltaTime);

    // const hasPlayerMoved = !this.player || !areVectorsEqual(this.lastPlayerGridPos, this.player.gridPos);
    // if (hasPlayerMoved || !this.flowField) this.updatePathFindingGrid();

    if (this.pathfindingStaleTimer > 0) this.pathfindingStaleTimer -= _deltaTime;
    else {
      this.updatePathFindingGrid();
      this.pathfindingStaleTimer = this.pathfindingStaleAmountSec;
      console.count("Pathfinding");
    }

    if (!this.getIsDay() && !!this.player) {
      this.nightEndCounter -= _deltaTime;
      if (this.nightEndCounter <= 0) this.startDay();
    }
  }

  public drawEntities(): void {
    this.drawMapLayers("below");
    for (const zombie of this.zombies.values()) zombie.draw();
    for (const block of this.blocks.values()) block.draw();
    for (const coin of this.collectables.values()) coin.draw();
    this.player?.draw();
    this.drawMapLayers("above");

    const { DrawManager, CameraManager, GameManager } = this.gameInstance.MANAGERS;

    if (GameManager.getSettings().debug.enableFlowFieldRender) {
      const size = GRID_CONFIG.TILE_SIZE;

      for (let x = 0; x < GRID_CONFIG.GRID_WIDTH; x++) {
        for (let y = 0; y < GRID_CONFIG.GRID_HEIGHT; y++) {
          if (!CameraManager.isOnScreen({ x: x * size, y: y * size })) continue;

          if (this.levelGrid?.[x]?.[y]?.state !== GridTileState.AVAILABLE)
            DrawManager.drawRectFilled(x * size, y * size, size, size, "#000", 0.4);
          DrawManager.drawRectOutline(x * size, y * size, size, size, "#fff", 0.1);

          if (this.flowField?.[x]?.[y]) {
            const currentFieldCell = this.flowField[x][y];
            const weight = currentFieldCell.weight;
            const vector = currentFieldCell.normalizedVector;
            if (weight === Infinity || weight === 0) continue;

            const green = `0${Math.floor(230 - Math.min(200, (200 / 20) * weight)).toString(16)}`.slice(-2);
            const red = `0${Math.floor(55 + Math.min(200, (200 / 20) * weight)).toString(16)}`.slice(-2);
            DrawManager.drawLine(
              x * size + size / 2,
              y * size + size / 2,
              (x + vector.x) * size + size / 2,
              (y + vector.y) * size + size / 2,
              "#9f9fffa0",
              2,
            );
            DrawManager.drawText(
              weight.toString(),
              x * size + size / 2 - 1,
              y * size + size / 2 - 1,
              "#000",
              25,
              "Courier",
              "center",
            );
            DrawManager.drawText(
              weight.toString(),
              x * size + size / 2 + 2,
              y * size + size / 2 + 2,
              "#000",
              25,
              "Courier",
              "center",
            );
            DrawManager.drawText(
              weight.toString(),
              x * size + size / 2,
              y * size + size / 2,
              `#${red}${green}50`,
              25,
              "Courier",
              "center",
            );
          }
        }
      }
    }

    if (!this.getIsDay() && this.player) {
      this.gameInstance.MANAGERS.LightManager.drawNightLighting(
        [this.player.worldPos],
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

  private drawMapLayers(position: "above" | "below"): void {
    if (!this.tileLayers || !this.tileset) return;

    const { GameManager } = this.gameInstance.MANAGERS;
    this.gameInstance.MANAGERS.DrawManager.queueDraw(
      0,
      0,
      position === "above" ? this.mapLayerAbovePlayer : this.mapLayerBelowPlayer,
      GRID_CONFIG.GRID_WIDTH * GRID_CONFIG.TILE_SIZE,
      GRID_CONFIG.GRID_HEIGHT * GRID_CONFIG.TILE_SIZE,
      position === "above" ? ZIndex.MAP_OVERLAY : ZIndex.MAP_GROUND,
      0,
      GameManager.getSettings().debug.enableFlowFieldRender ? 0.5 : 1,
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
    for (const track of this.musicDay) track.pause();
    for (const track of this.musicNight) track.pause();
    this.gameInstance.MANAGERS.AssetManager.playAudioAsset("AMusicBackgroundDead", "music");
    this.player?.destroy();
    this.player = undefined;
    for (const zombie of this.zombies.values()) zombie.startWandering();
  }

  public spawnBlock(pos: GridPosition, type: BlockTypes = BlockTypes.Wood): void {
    const entityId = this.entityIdCounter++;
    let entity: ABlock;

    switch (type) {
      case BlockTypes.Wood:
        entity = new BlockWood(pos, entityId, this.gameInstance);
        break;
      case BlockTypes.FireBarrel:
        entity = new BlockBarrelFire(pos, entityId, this.gameInstance);
        break;
      default:
        return assertNever(type);
    }

    this.blocks.set(entityId, entity);
    if (!this.levelGrid) return;
    const { x, y } = pos;
    this.levelGrid[x][y] = { ...this.levelGrid[x][y], state: GridTileState.BLOCKED, ref: entity };
    this.updatePathFindingGrid();
  }

  private destroyBlock(entityId: number): void {
    const entity = this.blocks.get(entityId);
    if (!entity) return;
    entity.destroy();
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
    entity.destroy();
    this.collectables.delete(entityId);
  }

  private destroyZombie(entityId: number): void {
    const entity = this.zombies.get(entityId);
    if (!entity) return;
    entity.destroy();
    this.zombies.delete(entityId);
  }

  // Zombies
  // ==================================================

  private startSpawningZombies(): void {
    const settings = this.gameInstance.MANAGERS.GameManager.getSettings().rules.game;
    this.isSpawningZombies = true;
    const dayCountCoef = (this.levelState?.daysCounter ?? 1) - 1;
    this.zombieSpawnsLeft = Math.ceil(settings.zombieSpawnAmount * settings.zombieSpawnCoef ** dayCountCoef);
    this.zombieSpawnInterval = Math.floor(
      Math.min(settings.zombieSpawnIntervalMs, (settings.nightDurationSec * 1000) / this.zombieSpawnsLeft),
    );

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

  private getRandomZombieSpawnPosition(): WorldPosition {
    return this.mapSpawnPoints[Math.floor(Math.random() * this.mapSpawnPoints.length)] || { x: 0, y: 0 };
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

    this.addCurrency(this.gameInstance.MANAGERS.GameManager.getSettings().rules.game.endNightReward);

    this.retreatFlowFields = [];
    const amount = Math.max(20, this.zombies.size);
    for (let i = 0; i < amount; i++) {
      this.retreatFlowFields.push(
        generateFlowField(
          this.levelGrid,
          this.zombies,
          ...this.getRandomEdgePositions(),
          ...this.getRandomEdgePositions(),
        ),
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
    // if (this.getIsDay()) return;
    if (!this.player || !this.levelGrid) return;
    // this.lastPlayerGridPos = this.player.gridPos;
    this.flowField = generateFlowField(this.levelGrid, this.zombies, this.player.gridPos);
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

    this.player = undefined;
    this.zombies.clear();
    this.blocks.clear();
    this.collectables.clear();

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
}
