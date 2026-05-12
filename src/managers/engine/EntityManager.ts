import type { AnyEntity } from "../../entities/engine/AEntity";
import type BlockBarrelFire from "../../entities/game/blocks/BlockBarrelFire";
import type BlockWood from "../../entities/game/blocks/BlockWood";
import type Coin from "../../entities/game/collectables/Coin";
import type Zombie from "../../entities/game/enemies/Zombie";
import type Player from "../../entities/game/player/Player";
import type GameInstance from "../../GameInstance";
import assertNever from "../../utils/assertNever";
import { AManager } from "../abstract/AManager";

type EntityTypePlayer = Player;
type EntityTypeEnemy = Zombie;
type EntityTypeCollectable = Coin;
type EntityTypeBlock = BlockBarrelFire | BlockWood;

export type EntityID = number;

export enum EntityType {
  PLAYER = "PLAYER",
  ENEMY = "ENEMY",
  COLLECTABLE = "COLLECTABLE",
  BLOCK = "BLOCK",
}

export class EntityManager extends AManager {
  private _entityIdCounter: EntityID = 0;
  private _entities: Map<EntityID, AnyEntity>;

  // Indexing helpers
  private _players: Set<EntityID>;
  private _enemies: Set<EntityID>;
  private _collectables: Set<EntityID>;
  private _blocks: Set<EntityID>;

  constructor(gameInstance: GameInstance) {
    super(gameInstance);

    this._entities = new Map<EntityID, AnyEntity>();
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

  public findEntity(id: EntityID): AnyEntity | undefined {
    return this._entities.get(id);
  }

  public createEntity<T extends AnyEntity>(type: EntityType, createFactory: (id: EntityID) => T): T {
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
