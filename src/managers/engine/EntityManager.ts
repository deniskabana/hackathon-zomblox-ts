import type AEntity from "../../entities/engine/AEntity";
import type GameInstance from "../../GameInstance";
import assertNever from "../../utils/assertNever";
import { AManager } from "../abstract/AManager";

export type EntityID = number;

export enum EntityType {
  PLAYER = "PLAYER",
  ENEMY = "ENEMY",
  COLLECTABLE = "COLLECTABLE",
  BLOCK = "BLOCK",
}

export class EntityManager extends AManager {
  private _entityIdCounter: EntityID = 0;
  private _entities: Map<EntityID, AEntity>;

  // Indexing helpers
  private _players: Set<EntityID>;
  private _enemies: Set<EntityID>;
  private _collectables: Set<EntityID>;
  private _blocks: Set<EntityID>;

  constructor(gameInstance: GameInstance) {
    super(gameInstance);

    this._entities = new Map<EntityID, AEntity>();
    this._players = new Set<EntityID>();
    this._enemies = new Set<EntityID>();
    this._collectables = new Set<EntityID>();
    this._blocks = new Set<EntityID>();
  }

  public init() {
    this._entities.clear();
    this._players.clear();
    this._enemies.clear();
    this._collectables.clear();
    this._blocks.clear();
  }

  public destroy() {
    this._entityIdCounter = 0;
  }

  public updateBefore(_deltaTime: number, _unscaledDeltaTime: number): void {
    for (const entity of this._entities.values()) entity._updateBefore(_deltaTime, _unscaledDeltaTime);
  }
  public updateAfter(_deltaTime: number, _unscaledDeltaTime: number): void {
    for (const entity of this._entities.values()) entity._updateAfter(_deltaTime, _unscaledDeltaTime);
  }
  public draw(): void {
    for (const entity of this._entities.values()) entity._draw();
  }

  public findEntity(id: EntityID): AEntity | undefined {
    return this._entities.get(id);
  }

  public createEntity<T extends AEntity>(type: EntityType, createFactory: (id: EntityID) => T): T {
    const id = ++this._entityIdCounter;
    const entity = createFactory(id);
    this._entities.set(id, entity);

    switch (type) {
      case EntityType.PLAYER:
        this._players.add(id);
        break;
      case EntityType.ENEMY:
        this._enemies.add(id);
        break;
      case EntityType.COLLECTABLE:
        this._collectables.add(id);
        break;
      case EntityType.BLOCK:
        this._blocks.add(id);
        break;
      default:
        assertNever(type);
    }

    return entity;
  }

  public destroyEntity(id: EntityID): void {
    if (!this._entities.has(id)) return;

    this._entities.get(id)?._destructor();

    this._players.delete(id);
    this._enemies.delete(id);
    this._collectables.delete(id);
    this._blocks.delete(id);

    this._entities.delete(id);
  }

  public getEnemies(): AEntity[] {
    return Array.from(this._enemies).reduce<AEntity[]>((list, id) => {
      const entity = this._entities.get(id);
      if (entity) list.push(entity);
      return list;
    }, []);
  }
  public getPlayers(): AEntity[] {
    return Array.from(this._players).reduce<AEntity[]>((list, id) => {
      const entity = this._entities.get(id);
      if (entity) list.push(entity);
      return list;
    }, []);
  }
  public getCollectables(): AEntity[] {
    return Array.from(this._collectables).reduce<AEntity[]>((list, id) => {
      const entity = this._entities.get(id);
      if (entity) list.push(entity);
      return list;
    }, []);
  }
  public getBlocks(): AEntity[] {
    return Array.from(this._blocks).reduce<AEntity[]>((list, id) => {
      const entity = this._entities.get(id);
      if (entity) list.push(entity);
      return list;
    }, []);
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
