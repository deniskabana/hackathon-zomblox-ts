import Matter from "matter-js";
import type { AnyEntity } from "../../entities/engine/AEntity";
import type BlockBarrelFire from "../../entities/game/blocks/BlockBarrelFire";
import type BlockWood from "../../entities/game/blocks/BlockWood";
import type Coin from "../../entities/game/collectables/Coin";
import type Zombie from "../../entities/game/enemies/Zombie";
import type Player from "../../entities/game/player/Player";
import type GameInstance from "../../GameInstance";
import assertNever from "../../utils/assertNever";
import { AManager } from "../abstract/AManager";
import { GRID_CONFIG } from "../../config/core/grid.config";
import { GridTileState } from "../../utils/grid/generateMapBlockGrid";
import { EntityType } from "../../types/engine/EntityType";

type EntityTypePlayer = Player;
type EntityTypeEnemy = Zombie;
type EntityTypeCollectable = Coin;
type EntityTypeBlock = BlockBarrelFire | BlockWood;

export type EntityID = number;

export class EntityManager extends AManager {
  private _entityIdCounter: EntityID = 0;
  private _entities: Map<EntityID, AnyEntity>;

  // Indexing helpers
  private _players: Set<EntityID>;
  private _enemies: Set<EntityID>;
  private _collectables: Set<EntityID>;
  private _blocks: Set<EntityID>;

  public _physicsEngine: Matter.Engine;
  public _physicsBodies: Map<EntityID, Matter.Body>;
  public _physicsDebugRender: undefined | Matter.Render;

  private physicsRenderContainer: undefined | HTMLDivElement;

  private _accumulator = 0;
  private readonly FIXED_STEP = 1000 / 60; // 16.67ms
  private readonly MAX_STEPS = 5;

  constructor(gameInstance: GameInstance) {
    super(gameInstance);

    this._entities = new Map<EntityID, AnyEntity>();
    this._players = new Set<EntityID>();
    this._enemies = new Set<EntityID>();
    this._collectables = new Set<EntityID>();
    this._blocks = new Set<EntityID>();

    // Matter.js integration
    this._physicsEngine = Matter.Engine.create({ gravity: { x: 0, y: 0, scale: 0 } });
    this._physicsBodies = new Map<EntityID, Matter.Body>();

    if (!this.gameInstance.isDev) return;
    this.physicsRenderContainer = document.createElement("div");
    this.physicsRenderContainer.style.opacity = "0.75";
    this.physicsRenderContainer.style.position = "fixed";
    this.physicsRenderContainer.style.left = "32px";
    this.physicsRenderContainer.style.top = "32px";
    this.physicsRenderContainer.style.zIndex = "1";
    this.physicsRenderContainer.style.pointerEvents = "none";
    document.body.appendChild(this.physicsRenderContainer);
    this._physicsDebugRender = Matter.Render.create({
      element: this.physicsRenderContainer,
      engine: this._physicsEngine,
      options: { hasBounds: true },
      bounds: {
        min: { x: 0, y: 0 },
        max: { x: GRID_CONFIG.GRID_WIDTH * GRID_CONFIG.TILE_SIZE, y: GRID_CONFIG.GRID_HEIGHT * GRID_CONFIG.TILE_SIZE },
      },
    });
  }

  public _init() {
    this._entities.clear();
    this._players.clear();
    this._enemies.clear();
    this._collectables.clear();
    this._blocks.clear();

    if (this._physicsDebugRender) Matter.Render.run(this._physicsDebugRender);
  }

  public _destroy() {
    for (const id of this._entities.keys()) this.destroyEntity(id);
    this._entityIdCounter = 0;
    this.clearPhysicsMap();
  }

  public updateBefore(_deltaTime: number, _unscaledDeltaTime: number): void {
    for (const entity of this._entities.values()) {
      entity._updateBefore(_deltaTime, _unscaledDeltaTime);
    }

    const cappedDelta = Math.min(_unscaledDeltaTime * 1000, this.FIXED_STEP * this.MAX_STEPS);
    const timeScale = _unscaledDeltaTime > 0 ? _deltaTime / _unscaledDeltaTime : 1;
    this._accumulator += cappedDelta * timeScale;

    let steps = 0;
    while (this._accumulator >= this.FIXED_STEP && steps < this.MAX_STEPS) {
      Matter.Engine.update(this._physicsEngine, this.FIXED_STEP);
      this._accumulator -= this.FIXED_STEP;
      steps++;
    }

    for (const [id, entity] of this._entities) {
      const body = this._physicsBodies.get(id);
      if (body)
        entity._setWorldPosition({
          x: body.position.x - (body.plugin?.offset?.x ?? 0),
          y: body.position.y - (body.plugin?.offset?.y ?? 0),
        });
    }
  }
  public updateAfter(_deltaTime: number, _unscaledDeltaTime: number): void {
    for (const entity of this._entities.values()) entity._updateAfter(_deltaTime, _unscaledDeltaTime);

    const { SettingsManager } = this.gameInstance.MANAGERS;
    const { debugDrawPhysics } = SettingsManager.getSettings().rules;

    if (!this.physicsRenderContainer) return;

    if (debugDrawPhysics) this.physicsRenderContainer.style.display = "block";
    else this.physicsRenderContainer.style.display = "none";
  }
  public draw(): void {
    for (const entity of this._entities.values()) entity._draw();
  }

  public findEntity(id: EntityID): AnyEntity | undefined {
    return this._entities.get(id);
  }

  public createEntity<T extends AnyEntity>(type: EntityType, createFactory: (id: EntityID) => T): T {
    const id = ++this._entityIdCounter;
    const entity = createFactory(id);
    this._entities.set(id, entity);

    let body: Matter.Body;

    if (type === EntityType.ENEMY) {
      body = Matter.Bodies.circle(entity._getWorldPosition().x, entity._getWorldPosition().y, entity._getSize() / 4, {
        frictionAir: 0.6,
        friction: 0,
        frictionStatic: 0,
        inertia: Infinity,
        restitution: 0,
      });
    } else {
      body = Matter.Bodies.rectangle(...entity._getPhysicsRect(), {
        isStatic: type === EntityType.BLOCK,
        frictionAir: 0.6,
        friction: 0,
        frictionStatic: 0,
        inertia: Infinity,
        restitution: 0,
      });
    }

    switch (type) {
      case EntityType.PLAYER:
        this._players.add(id);
        break;
      case EntityType.ENEMY:
        this._enemies.add(id);
        break;
      case EntityType.COLLECTABLE:
        Matter.Body.set(body, { isSensor: true });
        this._collectables.add(id);
        break;
      case EntityType.BLOCK:
        this._blocks.add(id);
        break;
      case EntityType.SENSOR:
        Matter.Body.set(body, { isSensor: true });
        break;
      default:
        assertNever(type);
    }

    Matter.Composite.add(this._physicsEngine.world, body);
    body.plugin.offset = {
      x: (entity._collisionPoints[0].x + entity._collisionPoints[1].x) / 2,
      y: (entity._collisionPoints[0].y + entity._collisionPoints[2].y) / 2,
    };
    body.plugin.entity = entity;

    this._physicsBodies.set(id, body);
    entity._physicsBody = body;

    return entity;
  }

  public destroyEntity(id: EntityID): void {
    if (!this._entities.has(id)) return;

    const body = this._physicsBodies.get(id);
    if (body) Matter.Composite.remove(this._physicsEngine.world, body);

    this._players.delete(id);
    this._enemies.delete(id);
    this._collectables.delete(id);
    this._blocks.delete(id);

    this._entities.delete(id);
  }

  public getEnemies(): EntityTypeEnemy[] {
    return Array.from(this._enemies).reduce<EntityTypeEnemy[]>((list, id) => {
      const entity = this._entities.get(id);
      if (entity) list.push(entity as EntityTypeEnemy);
      return list;
    }, []);
  }
  public getPlayers(): EntityTypePlayer[] {
    return Array.from(this._players).reduce<EntityTypePlayer[]>((list, id) => {
      const entity = this._entities.get(id);
      if (entity) list.push(entity as EntityTypePlayer);
      return list;
    }, []);
  }
  public getCollectables(): EntityTypeCollectable[] {
    return Array.from(this._collectables).reduce<EntityTypeCollectable[]>((list, id) => {
      const entity = this._entities.get(id);
      if (entity) list.push(entity as unknown as EntityTypeCollectable);
      return list;
    }, []);
  }
  public getBlocks(): EntityTypeBlock[] {
    return Array.from(this._blocks).reduce<EntityTypeBlock[]>((list, id) => {
      const entity = this._entities.get(id);
      if (entity) list.push(entity as unknown as EntityTypeBlock);
      return list;
    }, []);
  }

  public addPhysicsStaticMap(levelGrid: GridTileState[][] | undefined) {
    const { GRID_WIDTH, GRID_HEIGHT, TILE_SIZE } = GRID_CONFIG;
    if (!levelGrid) return;

    for (let x = 0; x < GRID_WIDTH; x++) {
      for (let y = 0; y < GRID_HEIGHT; y++) {
        if (levelGrid?.[x]?.[y] !== GridTileState.BLOCKED) continue;

        // check if 3x3 grid around self is blocked or unavailable
        let areAllTilesBlocked = true;
        for (let gx = -1; gx <= 1; gx++) {
          for (let gy = -1; gy <= 1; gy++) {
            if (gx === 0 && gy === 0) continue;
            if (!levelGrid?.[x + gx]?.[y + gy]) continue;
            if (levelGrid?.[x + gx]?.[y + gy] !== GridTileState.BLOCKED) areAllTilesBlocked = false;
          }
        }
        if (areAllTilesBlocked) continue;

        Matter.Composite.add(
          this._physicsEngine.world,
          Matter.Bodies.circle(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, TILE_SIZE / 2, {
            isStatic: true,
          }),
        );
      }
    }
  }

  public clearPhysicsMap(keepStatic: boolean = false) {
    Matter.Composite.clear(this._physicsEngine.world, keepStatic);
  }

  public getEntityByPhysicsBody(body: Matter.Body): AnyEntity | undefined {
    for (const [id, entityBody] of this._physicsBodies.entries()) {
      if (body !== entityBody) continue;
      return this._entities.get(id);
    }
  }

  public _toDebugSnapshot(): Record<string, unknown> {
    return {
      entities: Array.from(this._entities.entries()).reduce<Record<EntityID, unknown>>((acc, [id, entity]) => {
        acc[id] = entity._toDebugSnapshot();
        return acc;
      }, {}),
      nextId: new Number(this._entityIdCounter),
    };
  }
}
