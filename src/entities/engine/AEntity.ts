import { type WorldPosition, type GridPosition, worldToGrid } from "../../config/core/grid.config";
import type GameInstance from "../../GameInstance";
import { EntityAnimations, type EntityAnimationsSpecs } from "./systems/EntityAnimation";
import { EntityTimer } from "./systems/EntityTimer";

export interface AEntityEngine {
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
  private _state: TState;

  protected _timers: TTimers;
  protected _animations: EntityAnimations | undefined;
  protected _instance: TInstance;
  protected _settings: TSettings;

  /** Entity manifest — implement in every subclass as an object literal. */
  public abstract _engine: AEntityEngine;

  constructor(props: {
    health?: number;
    worldPos: WorldPosition;
    entityId: number;
    size: number;
    initialState: TState;
    timers?: TTimers;
    animations?: EntityAnimationsSpecs;
    instance?: TInstance;
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
    if (props.animations) this._animations = new EntityAnimations(props.animations);
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
    this._worldPos = worldPos;
    this._gridPos = worldToGrid(worldPos);
  }
  public _setHealth(health: number): void {
    this._health = health;
  }

  // Getters
  // --------------------------------------------------

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
}
