import {
  GRID_CONFIG,
  gridToWorld,
  setGridConfig,
  WORLD_SIZE,
  type GridPosition,
  type WorldPosition,
} from "../config/gameGrid";
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
import type { TileBounds } from "../types/TileBounds";
import { ZIndex } from "../types/ZIndex";
import assertNever from "../utils/assertNever";
import generateEmptyLevelGrid from "../utils/grid/generateEmptyLevelGrid";
import generateFlowField, { type FlowField } from "../utils/grid/generateFlowFieldMap";
import raycast2D from "../utils/grid/raycast2D";
import areVectorsEqual from "../utils/math/areVectorsEqual";
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

  // Entities
  public player?: Player;
  public zombies: Map<number, Zombie> = new Map();
  public blocks: Map<number, ABlock> = new Map();
  public collectables: Map<number, ACollectable> = new Map();

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

  constructor(gameInstance: GameInstance) {
    super(gameInstance);
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
    this.lastPlayerGridPos = this.player.gridPos;

    const gameSettings = this.gameInstance.MANAGERS.GameManager.getSettings().rules.game;
    this.zombieSpawnInterval = gameSettings.zombieSpawnIntervalMs;
    this.levelState = { phase: "day", daysCounter: 0 };
  }

  public update(_deltaTime: number) {
    this.player?.update(_deltaTime);

    for (const zombie of this.zombies.values()) zombie.update(_deltaTime);
    for (const block of this.blocks.values()) block.update(_deltaTime);
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
    if (this.tileLayers && this.tileset) this.drawTileLayers();

    for (const zombie of this.zombies.values()) zombie.draw();
    for (const block of this.blocks.values()) block.draw();
    for (const coin of this.collectables.values()) coin.draw();
    this.player?.draw();

    if (!this.getIsDay() && this.player) {
      this.gameInstance.MANAGERS.LightManager.drawNightLighting(
        [this.player.worldPos],
        this.player.getFacingDirection(),
        this.blocks,
      );
    }
  }

  private drawTileLayers(): void {
    if (!this.tileLayers || !this.tileset) return;

    const visibleBounds = this.getVisibleTileBounds();

    this.renderLayer(this.tileLayers.ground, ZIndex.MAP_GROUND, visibleBounds);
    this.renderLayer(this.tileLayers.groundDecor, ZIndex.MAP_GROUND_DECOR, visibleBounds);
    this.renderLayer(this.tileLayers.overlay, ZIndex.MAP_OVERLAY, visibleBounds);
    this.renderLayer(this.tileLayers.overlayDecor, ZIndex.MAP_OVERLAY_DECOR, visibleBounds);
  }

  private renderLayer(layer: number[], zIndex: number, bounds: TileBounds): void {
    for (let y = bounds.minY; y <= bounds.maxY; y++) {
      for (let x = bounds.minX; x <= bounds.maxX; x++) {
        const index = y * GRID_CONFIG.GRID_WIDTH + x;
        const tileId = layer[index];

        if (tileId === 0) continue;

        const tileData = this.tileset!.getTileFrame(tileId);
        if (!tileData) continue;

        const worldPos = gridToWorld({ x, y });
        this.gameInstance.MANAGERS.DrawManager.queueDrawSprite(
          worldPos.x - 1,
          worldPos.y - 1,
          tileData.spriteSheet,
          tileData.frameIndex,
          GRID_CONFIG.TILE_SIZE + 2,
          GRID_CONFIG.TILE_SIZE + 2,
          zIndex,
        );
      }
    }
  }

  private getVisibleTileBounds(): TileBounds {
    const camera = this.gameInstance.MANAGERS.CameraManager;
    const viewport = {
      width: camera.viewportWidth / camera.zoom,
      height: camera.viewportHeight / camera.zoom,
    };

    return {
      minX: Math.max(0, Math.floor((camera.x - viewport.width / 2) / GRID_CONFIG.TILE_SIZE)),
      maxX: Math.min(GRID_CONFIG.GRID_WIDTH - 1, Math.ceil((camera.x + viewport.width / 2) / GRID_CONFIG.TILE_SIZE)),
      minY: Math.max(0, Math.floor((camera.y - viewport.height / 2) / GRID_CONFIG.TILE_SIZE)),
      maxY: Math.min(GRID_CONFIG.GRID_HEIGHT - 1, Math.ceil((camera.y + viewport.height / 2) / GRID_CONFIG.TILE_SIZE)),
    };
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
