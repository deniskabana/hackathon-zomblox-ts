import { GRID_CONFIG, type GridPosition, gridToWorld, type WorldPosition } from "../../config/core/grid.config";
import type { DEFAULT_SETTINGS } from "../../config/game/settings.config";
import type GameInstance from "../../GameInstance";
import { EntityType } from "../../types/EntityType";
import type { Vector } from "../../types/Vector";
import { ZIndex } from "../../types/ZIndex";
import assertNever from "../../utils/assertNever";
import { AnimatedSpriteSheet } from "../../utils/classes/AnimatedSpriteSheet";
import isInsideGrid from "../../utils/grid/isInsideGrid";
import { clamp } from "../../utils/math/clamp";
import getDirectionalAngle from "../../utils/math/getDirectionalAngle";
import getVectorDistance from "../../utils/math/getVectorDistance";
import AEntity, { type EntityAnimations, type EntityBuiltInMethods } from "../abstract/AEntity";

/** `this.gameInstance` */ let _game: GameInstance;

export enum ZombieState {
  IDLE = "IDLE",
  CHASING = "CHASING",
  ATTACKING = "ATTACKING",
  RETREATING = "RETREATING",
  KNOCKED = "KNOCKED",
  HIT = "HIT",
  DEAD = "DEAD",
}

interface Timers {
  [key: string]: number;
  attackCooldown: number;
  attack: number;
  deathAnimation: number;
}

interface Animations extends EntityAnimations {
  spriteVariant: number;
}

interface Attributes {
  attackDuration: number;
  maxSpeed: number;
  minDistanceFromPlayer: number;
  rules: (typeof DEFAULT_SETTINGS)["rules"]["zombie"];
}

interface Instance {
  speed: number;
  hasDealtDamage: boolean;
  normalizedNextPos: Vector | undefined;
  isFacingLeft: boolean;
  distanceFromPlayer: number;
  prevGridPos: GridPosition | undefined;
}

/**
 * Zombie
 * - all behavior is pre-determined, non-simulated
 * - avoid using randomized patterns where possible, value predictability
 */
export default class Zombie extends AEntity<ZombieState, Instance, Timers, Animations> {
  public _attributes: Readonly<Attributes>;

  constructor(gridPos: GridPosition, entityId: number, gameInstance: GameInstance) {
    _game = gameInstance;
    const {
      AssetManager: { getImageAsset },
      GameManager,
    } = _game.MANAGERS;
    const { maxSpeed, maxHealth, attackDuration, minDistanceFromPlayer } = GameManager.getSettings().rules.zombie;

    const size: number = GRID_CONFIG.TILE_SIZE * 1.5;
    const fps: number = 8;
    const timers: Timers = { attack: Infinity, attackCooldown: Infinity, deathAnimation: Infinity };

    /** 1 - 4 */
    const spriteVariant = 1 + Math.floor(Math.random() * 4);
    const animationList = [
      AnimatedSpriteSheet.fromGrid(getImageAsset(`SZombie${spriteVariant}Idle` as never)!, 32, 32, 6, fps),
      AnimatedSpriteSheet.fromGrid(getImageAsset(`SZombie${spriteVariant}Run` as never)!, 32, 32, 8, fps),
      AnimatedSpriteSheet.fromGrid(getImageAsset(`SZombie${spriteVariant}Knocked` as never)!, 32, 32, 6, fps),
      AnimatedSpriteSheet.fromGrid(getImageAsset(`SZombie${spriteVariant}Hit` as never)!, 32, 32, 3, fps, false),
      AnimatedSpriteSheet.fromGrid(getImageAsset(`SZombie${spriteVariant}Death` as never)!, 32, 32, 8, fps, false),
    ];
    const animations: Animations = { fps, animationList, activeAnimations: null, spriteVariant: 0 };

    const instance: Instance = {
      hasDealtDamage: false,
      normalizedNextPos: undefined,
      speed: 0,
      isFacingLeft: false,
      distanceFromPlayer: Infinity,
      prevGridPos: undefined,
    };

    super({
      worldPos: gridToWorld(gridPos),
      size,
      entityId,
      animations,
      initialState: ZombieState.IDLE,
      timers,
      health: maxHealth,
      instance,
    });

    const rules = _game.MANAGERS.GameManager.getSettings().rules.zombie;
    this._attributes = Object.freeze({ maxSpeed, attackDuration, minDistanceFromPlayer, rules });
  }

  public _builtIn: EntityBuiltInMethods = {
    draw: (): void => {
      const { DrawManager } = _game.MANAGERS;
      const size = this._getSize();
      const { x, y } = this._getWorldPosition();
      const activeAnimation = this._animations.animationList[this._animations.activeAnimations?.[0] ?? 0];
      DrawManager.queueDrawSprite(
        x - size / 2,
        y - size / 2,
        activeAnimation,
        activeAnimation.getCurrentFrame(),
        size,
        (size / 288) * 311,
        ZIndex.ENTITIES,
      );
    },

    drawShadow: (): void => {
      const { DrawManager, AssetManager } = _game.MANAGERS;
      const { x, y } = this._getWorldPosition();
      const size = this._getSize();
      const shadowSprite = AssetManager.getImageAsset("IFXEntityShadow");
      if (!shadowSprite) return;
      DrawManager.queueDraw(x - size / 2, y - size / 1.75, shadowSprite, size, size, ZIndex.GROUND_EFFECTS);
    },

    drawDebug: (): void => {
      const {
        GameManager,
        LevelManager: { player },
        DrawManager,
      } = _game.MANAGERS;
      const debug = GameManager.getSettings().debug;
      const gridPos = this._getGridPosition();
      const { x, y } = this._getWorldPosition();
      const { TILE_SIZE } = GRID_CONFIG;

      if (debug.showZombieTarget && player && this._instance.normalizedNextPos && isInsideGrid(gridPos)) {
        DrawManager.drawArrow(
          x,
          y,
          x + TILE_SIZE * this._instance.normalizedNextPos?.x,
          y + TILE_SIZE * this._instance.normalizedNextPos?.y,
          "#5070ff",
          2,
        );
      }
      if (debug.showZombieState) {
        DrawManager.drawText(this._getState(), x, y - TILE_SIZE / 2, "#f89", 10, "Arial", "center");
      }
      if (debug.enableFlowFieldRender) {
        DrawManager.drawRectOutline(x, y, GRID_CONFIG.TILE_SIZE, GRID_CONFIG.TILE_SIZE, "#a24", 3);
      }
    },

    destructor: (): void => {
      const { LevelManager } = _game.MANAGERS;
      LevelManager.destroyEntity(this._entityId, EntityType.ENEMY);
    },

    update: (_deltaTime: number): void => {
      const { LevelManager } = _game.MANAGERS;
      const state = this._getState();

      switch (state) {
        case ZombieState.IDLE:
          this._animations.activeAnimations = [0];
          break;

        case ZombieState.CHASING:
          this._animations.activeAnimations = [1];
          this.updateChaseTarget();
          this.applyMovement(_deltaTime);
          break;

        case ZombieState.ATTACKING:
          this._animations.activeAnimations = [2]; // TODO: This is not the correct animation
          this.applyAttack(_deltaTime);
          break;

        case ZombieState.RETREATING:
          this._animations.activeAnimations = [1];
          this.updateRetreatTarget();
          this.applyMovement(_deltaTime);

          // Damage in sunlight
          if (isInsideGrid(this._getGridPosition()) && LevelManager.getIsDay()) this._handleDamage(_deltaTime * 1.5);
          break;

        case ZombieState.KNOCKED:
          this._animations.activeAnimations = [2];
          break;

        case ZombieState.HIT:
          this._animations.activeAnimations = [3];
          break;

        case ZombieState.DEAD:
          this._animations.activeAnimations = [4];
          if (this._timers.deathAnimation >= 0) this._destructor();
          break;

        default:
          assertNever(state);
      }
    },

    onDeath: () => {
      const { LevelManager, AssetManager, VFXManager } = _game.MANAGERS;
      const { TILE_SIZE } = GRID_CONFIG;
      const { x, y } = this._getWorldPosition();
      const fps = 8;
      LevelManager.spawnCoin({ x: x / TILE_SIZE - 0.5, y: y / TILE_SIZE - 0.5 });
      AssetManager.playAudioAsset("AZombieDeath", "sound");
      VFXManager.drawBloodPool({
        x: x - TILE_SIZE / 2 + (-0.5 + Math.random()) * 4,
        y: y - TILE_SIZE / 2 + (-0.5 + Math.random()) * 4,
      });
      this._setState(ZombieState.DEAD);
      this._timers.deathAnimation =
        this._animations.animationList[this._animations.activeAnimations?.[0] ?? 0].getFrameCount() * fps * -1;
    },
  };

  public startWaiting(): void {
    this._setState(ZombieState.IDLE);
    this._instance.speed = 0;
  }

  public startChasingPlayer(): void {
    this._setState(ZombieState.CHASING);
    this._instance.speed = this._attributes.maxSpeed;
  }

  public startRetreating(): void {
    this._setState(ZombieState.RETREATING);
    this._instance.speed = this._attributes.maxSpeed * 3.25;
  }

  public startAttacking(): void {
    const { AssetManager } = _game.MANAGERS;

    if (this._timers.attackCooldown < 0) return;
    this._setState(ZombieState.ATTACKING);
    this._timers.attack = this._attributes.attackDuration * -1;
    this._instance.hasDealtDamage = false;

    AssetManager.playAudioAsset("AZombieAttack", "sound", 0.85);
  }

  private applyAttack(_deltaTime: number): void {
    const zombieSettings = _game.MANAGERS.GameManager.getSettings().rules.zombie;
    const { hasDealtDamage, distanceFromPlayer } = this._instance;
    const { minDistanceFromPlayer } = this._attributes;
    const worldPos = this._getWorldPosition();
    const player = _game.MANAGERS.LevelManager.player;

    if (!hasDealtDamage && !!player) {
      if (distanceFromPlayer < minDistanceFromPlayer) {
        player._handleDamage(zombieSettings.attackDamage);
        player.handlePhysicsPushback(
          getDirectionalAngle(player._getWorldPosition(), worldPos),
          zombieSettings.attackPushbackStr,
        );
        this._instance.hasDealtDamage = true;
      }
    }

    // Cool down and reset after the entire attack duration has passed
    if (this._timers.attack >= 0) {
      this._timers.attackCooldown = zombieSettings.attackCooldownSec * -1;
      this._setState(ZombieState.CHASING);
    }
  }

  private updateChaseTarget() {
    const { LevelManager } = _game.MANAGERS;
    const player = LevelManager.player;
    const flowField = LevelManager.flowField;
    const gridPos = this._getGridPosition();
    if (!player || !flowField) return;

    this._instance.distanceFromPlayer = getVectorDistance(this._getWorldPosition(), player._getWorldPosition());

    if (isInsideGrid(gridPos) && this._instance.distanceFromPlayer > this._attributes.minDistanceFromPlayer) {
      this._instance.normalizedNextPos = flowField?.[gridPos.x]?.[gridPos.y]?.normalizedVector ?? { x: 0, y: 0 };
    } else {
      const safeX = clamp(1, gridPos.x, GRID_CONFIG.GRID_WIDTH - 2);
      const safeY = clamp(1, gridPos.y, GRID_CONFIG.GRID_HEIGHT - 2);
      this._instance.normalizedNextPos = { x: safeX, y: safeY };
    }

    this._instance.prevGridPos = { ...this._getGridPosition() };
  }

  private updateRetreatTarget() {
    const { LevelManager } = _game.MANAGERS;
    const retreatFlowFields = LevelManager.retreatFlowFields;
    const flowField = retreatFlowFields?.[0];
    const gridPos = this._getGridPosition();
    const { GRID_HEIGHT, GRID_WIDTH } = GRID_CONFIG;
    if (!flowField) return;

    if (!isInsideGrid(gridPos, GRID_CONFIG)) {
      this._setState(ZombieState.IDLE);
      this._setWorldPosition({
        x: Math.floor(Math.random() * (GRID_WIDTH - 1)),
        y: Math.floor(Math.random() * (GRID_HEIGHT - 1)),
      });
      return;
    }

    const { x, y } = gridPos;
    if (x <= 0 || x >= GRID_WIDTH - 1 || y <= 0 || y >= GRID_HEIGHT - 1) {
      const offsetX = x <= 0 ? -1 : x >= GRID_WIDTH - 1 ? 1 : 0;
      const offsetY = y <= 0 ? -1 : y >= GRID_HEIGHT - 1 ? 1 : 0;
      this._instance.normalizedNextPos = { x: x + offsetX * 2, y: y + offsetY * 2 };
      return;
    }

    this._instance.normalizedNextPos = flowField[gridPos.x]?.[gridPos.y]?.normalizedVector ?? { x: 0, y: 0 };
    this._instance.prevGridPos = { ...this._getGridPosition() };
  }

  private applyMovement(_deltaTime: number): void {
    if (!this._instance.normalizedNextPos) return;

    const { x, y } = this._getWorldPosition();
    const { normalizedNextPos } = this._instance;
    const futurePos: WorldPosition = {
      x: x + normalizedNextPos.x * this._instance.speed * _deltaTime,
      y: y + normalizedNextPos.y * this._instance.speed * _deltaTime,
    };

    this._setWorldPosition(futurePos);

    // Sprite orientation
    if (futurePos.x < x) this._instance.isFacingLeft = true;
    else if (futurePos.x > x) this._instance.isFacingLeft = false;
  }
}
