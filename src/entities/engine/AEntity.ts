import { type WorldPosition, type GridPosition, worldToGrid } from "../../config/core/grid.config";
import type GameInstance from "../../GameInstance";
import type { AABB } from "../../types/lib/AABB";
import type { Vector } from "../../types/lib/Vector";
import areVectorsEqual from "../../utils/math/areVectorsEqual";
import { EntityAnimations, type EntityAnimationsSpecs } from "./systems/EntityAnimation";
import type { EntityCollisionPoints } from "./systems/EntityCollisionPoints";
import { EntityTimer } from "./systems/EntityTimer";

export interface AEntityEngineBody {
  draw: () => void;
  drawDebug: () => void;
  drawShadow?: () => void;

  updateBefore?: (_deltaTime: number, _unscaledDeltaTime: number) => void;
  updateAfter?: (_deltaTime: number, _unscaledDeltaTime: number) => void;

  /** Returning `false` will exit without modifying health. */
  onDamage?: (amount: number) => boolean | void;
  onDeath?: () => void;
  onDestroy?: () => void;
}

export interface EntityConstructorProps {
  gridPos: GridPosition;
  entityId: number;
  gameInstance: GameInstance;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyEntity = AEntity<any, any, any, any> | AEntity;

/**
 * Abstract class `AEntity` describes shared structure of all in-game entities.
 */
export default abstract class AEntity<
  TState extends string | undefined = undefined,
  TInstance extends object | undefined = undefined,
  TTimers extends object | undefined = undefined,
  TSettings extends object | undefined = undefined,
> {
  protected readonly _entityId: number;

  private _worldPos: WorldPosition;
  private _gridPos: GridPosition;
  private _size: number;

  private _health: number;
  private _maxHealth: number;
  private _isDead: boolean = false;
  public _collisionPoints: EntityCollisionPoints;
  private _spanningGridTiles: GridPosition[];

  private _state: TState;

  protected _timers: TTimers;
  protected _animations: EntityAnimations | undefined;
  protected _instance: TInstance;
  protected _settings: TSettings;

  /** Entity manifest — implement in every subclass as an object literal. */
  public abstract _engine: AEntityEngineBody;

  constructor(props: {
    health?: number;
    worldPos: WorldPosition;
    entityId: number;
    size: number;
    initialState: TState;
    timers?: TTimers;
    animations?: EntityAnimationsSpecs;
    instance?: TInstance;
    collisionPoints: Vector[];
    settings?: TSettings;
  }) {
    this._entityId = props.entityId;
    this._health = props.health ?? Infinity;
    this._maxHealth = this._health;
    this._worldPos = props.worldPos;
    this._gridPos = worldToGrid(props.worldPos);
    this._size = props.size;
    this._state = props.initialState;
    this._instance = props.instance ?? ({} as TInstance);
    this._timers = props.timers ?? ({} as TTimers);
    this._settings = Object.freeze({ ...props.settings }) as TSettings;
    this._collisionPoints = props.collisionPoints ?? [];
    if (props.animations) this._animations = new EntityAnimations(props.animations);

    this._spanningGridTiles = [];
    this._setWorldPosition(props.worldPos);
  }

  public _updateBefore(_deltaTime: number, _unscaledDeltaTime: number): void {
    if (this._timers) {
      for (const key in this._timers) {
        const timer = (this._timers as never)?.[key] as EntityTimer | undefined;
        if (timer instanceof EntityTimer) timer._tick(_deltaTime);
      }
    }

    this._animations?.tick(_deltaTime);
    this._engine.updateBefore?.(_deltaTime, _unscaledDeltaTime);
  }

  public _updateAfter(_deltaTime: number, _unscaledDeltaTime: number): void {
    this._engine.updateAfter?.(_deltaTime, _unscaledDeltaTime);
  }

  public _draw(): void {
    this._engine.drawDebug();
    this._engine.drawShadow?.();
    this._engine.draw();
  }

  public _destructor(): void {
    this._engine.onDestroy?.();
  }

  public _handleDamage(amount: number): void {
    if (this._isDead) return;
    if (this._engine.onDamage?.(amount) === false) return;
    this._health = Math.max(0, this._health - amount);

    if (this._health <= 0) {
      this._isDead = true;
      this._engine.onDeath?.();
    }
  }

  public _toDebugSnapshot(): Record<string, unknown> {
    const timers: Record<string, { value: number; active: boolean }> = {};
    if (this._timers) {
      for (const key in this._timers)
        timers[key] = {
          value: (this._timers as Record<string, EntityTimer>)[key].value,
          active: (this._timers as Record<string, EntityTimer>)[key].getIsActive(),
        };
    }

    return {
      entityId: this._entityId,
      state: this._state,
      health: this._health,
      isDead: this._isDead,
      worldPos: this._getWorldPosition(),
      gridPos: this._getGridPosition(),
      timers,
      instance: this._instance ? { ...this._instance } : undefined,
      settings: this._settings,
    };
  }

  // Setters
  // --------------------------------------------------

  public _setState(state: TState): void {
    this._state = state;
  }
  public _setWorldPosition(worldPos: WorldPosition): void {
    this._worldPos = { x: Math.round(worldPos.x * 100) / 100, y: Math.round(worldPos.y * 100) / 100 };
    this._gridPos = worldToGrid(this._worldPos);

    const spanningGridTiles: GridPosition[] = [];
    for (const hitboxVector of this._getCollisionPoints()) {
      const gridVector = worldToGrid(hitboxVector);
      if (!spanningGridTiles.some(({ x, y }) => x === gridVector.x && y === gridVector.y))
        spanningGridTiles.push(gridVector);
    }
    this._spanningGridTiles = spanningGridTiles;
  }
  public _setHealth(health: number): void {
    this._health = health;
  }

  // Getters
  // --------------------------------------------------

  public _getCollisionPoints(worldPos?: WorldPosition): WorldPosition[] {
    const { x, y } = worldPos || this._getWorldPosition();
    return this._collisionPoints.map((vector) => ({
      x: Math.round((vector.x + x) * 100) / 100,
      y: Math.round((vector.y + y) * 100) / 100,
    }));
  }

  public _getAABB(worldPos?: WorldPosition): AABB {
    const points = this._getCollisionPoints(worldPos);

    return {
      left: Math.min(...points.map((p) => Math.round(p.x * 100) / 100)),
      right: Math.max(...points.map((p) => Math.round(p.x * 100) / 100)),
      top: Math.min(...points.map((p) => Math.round(p.y * 100) / 100)),
      bottom: Math.max(...points.map((p) => Math.round(p.y * 100) / 100)),
    };
  }

  public _getNearbyEntities(
    aabb: { left: number; right: number; top: number; bottom: number },
    enemyGrid: (AnyEntity[] | null)[][] | undefined,
    blockGrid: (AnyEntity[] | null)[][] | undefined,
  ): AnyEntity[] {
    const entities = new Set<AnyEntity>();

    const minGrid = worldToGrid({ x: aabb.left, y: aabb.top });
    const maxGrid = worldToGrid({ x: aabb.right, y: aabb.bottom });

    for (let gx = minGrid.x; gx <= maxGrid.x; gx++) {
      for (let gy = minGrid.y; gy <= maxGrid.y; gy++) {
        enemyGrid?.[gx]?.[gy]?.forEach((e) => entities.add(e));
        blockGrid?.[gx]?.[gy]?.forEach((e) => entities.add(e));
      }
    }

    return Array.from(entities);
  }

  public _getIsVectorInsideHitbox(worldPos: WorldPosition): boolean {
    const collisionPoints = this._getCollisionPoints();

    if (collisionPoints.length === 1) {
      return areVectorsEqual(worldPos, collisionPoints[0]);
    } else if (collisionPoints.length >= 2) {
      const { x, y } = this._getWorldPosition();
      const minX = collisionPoints.reduce((acc, val) => (val.x < acc ? val.x : acc), Infinity);
      const minY = collisionPoints.reduce((acc, val) => (val.y < acc ? val.y : acc), Infinity);
      const maxX = collisionPoints.reduce((acc, val) => (val.x > acc ? val.x : acc), -Infinity);
      const maxY = collisionPoints.reduce((acc, val) => (val.y > acc ? val.y : acc), -Infinity);

      return x >= minX && x <= maxX && y >= minY && y <= maxY;
    } else {
      return false; // not supported, assume not
    }
  }

  public _getSize(): number {
    return this._size;
  }
  public _getHealth(): number {
    return this._health;
  }
  public _getMaxHealth(): number {
    return this._maxHealth;
  }
  public _getIsDead(): boolean {
    return this._isDead;
  }
  public _getState(): TState {
    return this._state;
  }
  public _getGridPosition(): GridPosition {
    return { ...this._gridPos };
  }
  public _getWorldPosition(): WorldPosition {
    return { ...this._worldPos };
  }
  public _getEntityId(): number {
    return this._entityId;
  }
  public _getSpanningGridTiles(): GridPosition[] {
    return this._spanningGridTiles;
  }
}
