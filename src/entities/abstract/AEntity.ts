import { type WorldPosition, type GridPosition, worldToGrid, gridToWorld } from "../../config/core/grid.config";
import type { AnimatedSpriteSheet } from "../../utils/classes/AnimatedSpriteSheet";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyEntity = AEntity<any, any, any, any>;

/**
 * Built-in methods defined and used by AEntity
 */
export interface EntityBuiltInMethods {
  draw: () => void;
  drawShadow?: () => void;
  drawDebug: () => void;
  destructor: () => void;
  update: (_deltaTime: number) => void;
  onDamage?: (amount: number) => void;
  onDeath?: () => void;
}

/**
 * Extend from this interface for `this._animations`
 */
export interface EntityAnimations {
  fps: number;
  activeAnimations: number[] | null;
  animationList: AnimatedSpriteSheet[];
}

/**
 * Abstract class `AEntity` describes shared structure of all in-game entities
 * that can be instantiated.
 */
export default abstract class AEntity<
  TState extends string | undefined,
  TInstance extends object | undefined,
  TTimers extends { [key: string]: number } | undefined,
  TAnimations extends EntityAnimations | undefined,
> {
  protected readonly _entityId: number;

  private _worldPos: WorldPosition;
  private _gridPos: GridPosition;
  private _size: number;
  private _health: number;
  private _state: TState;
  protected _timers: TTimers;

  /** Animations object updated by `AEntity` using fps. */
  protected _animations: TAnimations;
  /** Runtime instance memory. */
  protected _instance: TInstance;
  /** Readonly attributes assigned in constructor. */
  protected _attributes?: Readonly<Record<string, unknown>>;

  /** Built-in methods used by the game engine. Shared API. */
  abstract _builtIn: EntityBuiltInMethods;

  constructor(props: {
    health?: number;
    worldPos: WorldPosition;
    entityId: number;
    size: number;
    initialState: TState;
    timers: TTimers;
    animations: TAnimations;
    instance: TInstance;
  }) {
    this._entityId = props.entityId;

    this._health = props.health ?? Infinity;
    this._worldPos = props.worldPos;
    this._gridPos = gridToWorld(props.worldPos);
    this._size = props.size;

    this._state = props.initialState;
    this._instance = props.instance;

    this._timers = props.timers;
    this._animations = props.animations;
  }

  /*
   * Built-in
   */

  public _update(_deltaTime: number): void {
    this._builtIn.update(_deltaTime);

    if (this._timers) {
      for (const timerName in this._timers) {
        this._timers[timerName] += _deltaTime;
      }
    }

    if (this._animations?.activeAnimations?.length) {
      const { activeAnimations, fps, animationList } = this._animations;
      for (const animationIndex of activeAnimations) {
        animationList[animationIndex]?.update?.(Math.min(_deltaTime, 1 / fps));
      }
    }
  }

  public _draw(): void {
    this._builtIn.drawDebug();
    this._builtIn.drawShadow?.();
    this._builtIn.draw();
  }

  public _destructor(): void {
    this._builtIn.destructor();
  }

  /*
   * Handlers
   */

  public _handleDeath(): void {
    this._builtIn.onDeath?.();
  }

  public _handleDamage(amount: number): void {
    if (this._health - amount <= 0) this._handleDeath();
    this._health -= amount;
    this._builtIn.onDamage?.(amount);
  }

  /*
   * Setters
   */

  public _setState(state: TState): void {
    this._state = state;
  }

  public _setWorldPosition(worldPos: WorldPosition): void {
    this._worldPos = worldPos;
    this._gridPos = worldToGrid(worldPos);
  }

  /*
   * Getters
   */

  public _getSize(): number {
    return this._size;
  }
  public _getHealth(): number {
    return this._health;
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
}
