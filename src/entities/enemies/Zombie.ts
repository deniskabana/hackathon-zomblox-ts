import {
  GRID_CONFIG,
  type GridPosition,
  gridToWorld,
  type WorldPosition,
  worldToGrid,
} from "../../config/core/grid.config";
import type { DEFAULT_SETTINGS } from "../../config/game/settings.config";
import type GameInstance from "../../GameInstance";
import type { AssetImage } from "../../types/Asset";
import { EntityType } from "../../types/EntityType";
import type { Vector } from "../../types/Vector";
import { ZIndex } from "../../types/ZIndex";
import assertNever from "../../utils/assertNever";
import { AnimatedSpriteSheet } from "../../utils/classes/AnimatedSpriteSheet";
import isInsideGrid from "../../utils/grid/isInsideGrid";
import areVectorsEqual from "../../utils/math/areVectorsEqual";
import lerp from "../../utils/math/lerp";
import { lerpAngle } from "../../utils/math/radialLerp";
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
  movementRestart: number;
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
  velocity: number;
  desiredVelocity: number;
  direction: number;
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
    const { AssetManager, GameManager, LevelManager } = _game.MANAGERS;
    const { maxSpeed, maxHealth, attackDuration, minDistanceFromPlayer } = GameManager.getSettings().rules.zombie;

    const size: number = GRID_CONFIG.TILE_SIZE * 1.5;
    const fps: number = 9;
    const timers: Timers = {
      attack: Infinity,
      attackCooldown: Infinity,
      deathAnimation: Infinity,
      movementRestart: Infinity,
    };

    // Animations - could be much easier done as a json import
    type AnimationName = "idle" | "run" | "knocked" | "hit" | "death";
    const fw = 32;
    const fh = 32;
    const frames: Record<AnimationName, number> = { idle: 6, run: 8, knocked: 6, hit: 3, death: 8 };
    const animationAssets: Record<AnimationName, AssetImage | undefined>[] = [
      {
        idle: AssetManager.getImageAsset("SZombie1Idle"),
        run: AssetManager.getImageAsset("SZombie1Run"),
        knocked: AssetManager.getImageAsset("SZombie1Knocked"),
        hit: AssetManager.getImageAsset("SZombie1Hit"),
        death: AssetManager.getImageAsset("SZombie1Death"),
      },
      {
        idle: AssetManager.getImageAsset("SZombie2Idle"),
        run: AssetManager.getImageAsset("SZombie2Run"),
        knocked: AssetManager.getImageAsset("SZombie2Knocked"),
        hit: AssetManager.getImageAsset("SZombie2Hit"),
        death: AssetManager.getImageAsset("SZombie2Death"),
      },
      {
        idle: AssetManager.getImageAsset("SZombie3Idle"),
        run: AssetManager.getImageAsset("SZombie3Run"),
        knocked: AssetManager.getImageAsset("SZombie3Knocked"),
        hit: AssetManager.getImageAsset("SZombie3Hit"),
        death: AssetManager.getImageAsset("SZombie3Death"),
      },
      {
        idle: AssetManager.getImageAsset("SZombie4Idle"),
        run: AssetManager.getImageAsset("SZombie4Run"),
        knocked: AssetManager.getImageAsset("SZombie4Knocked"),
        hit: AssetManager.getImageAsset("SZombie4Hit"),
        death: AssetManager.getImageAsset("SZombie4Death"),
      },
    ];

    const animIndex = Math.floor(Math.random() * animationAssets.length);
    const animationList = [
      AnimatedSpriteSheet.fromGrid(animationAssets[animIndex].idle!, fw, fh, frames.idle, fps * 0.65),
      AnimatedSpriteSheet.fromGrid(animationAssets[animIndex].run!, fw, fh, frames.run, fps),
      AnimatedSpriteSheet.fromGrid(animationAssets[animIndex].knocked!, fw, fh, frames.knocked, fps),
      AnimatedSpriteSheet.fromGrid(animationAssets[animIndex].hit!, fw, fh, frames.hit, fps, false),
      AnimatedSpriteSheet.fromGrid(animationAssets[animIndex].death!, fw, fh, frames.death, fps, false),
    ];
    const animations: Animations = { fps, animationList, activeAnimations: null, spriteVariant: 0 };

    const instance: Instance = {
      hasDealtDamage: false,
      normalizedNextPos: undefined,
      direction: 0,
      velocity: 0,
      desiredVelocity: maxSpeed,
      isFacingLeft: false,
      distanceFromPlayer: Infinity,
      prevGridPos: undefined,
    };

    super({
      worldPos: gridToWorld(gridPos),
      size,
      entityId,
      animations,
      initialState: ZombieState.CHASING,
      timers,
      health: maxHealth,
      instance,
    });

    const rules = GameManager.getSettings().rules.zombie;
    this._attributes = Object.freeze({ maxSpeed, attackDuration, minDistanceFromPlayer, rules });

    if (LevelManager.getIsDay()) this.startRetreating();
    else this.startChasingPlayer();
  }

  public _builtIn: EntityBuiltInMethods = {
    draw: () => {
      const { DrawManager } = _game.MANAGERS;
      const size = this._getSize();
      const { x, y } = this._getWorldPosition();
      const activeAnimation = this._animations.animationList[this._animations.activeAnimations?.[0] ?? 0];
      DrawManager.queueDrawSprite(
        x - size / 2,
        y - size / 2 - size / 4,
        activeAnimation,
        activeAnimation.getCurrentFrame(),
        size,
        (size / 288) * 311,
        ZIndex.ENTITIES,
        0,
        1,
        this._instance.isFacingLeft ? 1 : -1,
      );
    },

    drawShadow: () => {
      const { DrawManager, AssetManager } = _game.MANAGERS;
      const { x, y } = this._getWorldPosition();
      const size = this._getSize() * 0.75;
      const shadowSprite = AssetManager.getImageAsset("IFXEntityShadow");

      if (!shadowSprite) return;
      DrawManager.queueDraw(x - size / 2, y - size / 4, shadowSprite, size, size, ZIndex.GROUND_EFFECTS);
    },

    drawDebug: () => {
      const {
        GameManager,
        LevelManager: { player },
        DrawManager,
      } = _game.MANAGERS;
      const debug = GameManager.getSettings().debug;
      const { x, y } = this._getWorldPosition();
      const { TILE_SIZE } = GRID_CONFIG;

      if (debug.showZombieTarget && player) {
        DrawManager.drawArrow(
          x + 2,
          y + 2,
          x + (Math.cos(this._instance.direction) * TILE_SIZE) / 2 + 2,
          y + (Math.sin(this._instance.direction) * TILE_SIZE) / 2 + 2,
          "#000",
          2,
        );
        DrawManager.drawArrow(
          x,
          y,
          x + (Math.cos(this._instance.direction) * TILE_SIZE) / 2,
          y + (Math.sin(this._instance.direction) * TILE_SIZE) / 2,
          "#a090ff",
          2,
        );
      }
      if (debug.showZombieState) {
        DrawManager.drawText(this._getState(), x, y - TILE_SIZE / 2, "#f89", 10, "Arial", "center");
      }
      if (debug.enableFlowFieldRender) {
        DrawManager.drawRectOutline(x, y, GRID_CONFIG.TILE_SIZE, GRID_CONFIG.TILE_SIZE, "#aa42a480", 1.5);
      }
    },

    destructor: () => {},

    update: (_deltaTime) => {
      const { LevelManager } = _game.MANAGERS;
      const state = this._getState();
      const { x: gx, y: gy } = this._getGridPosition();
      const { x: pgx, y: pgy } = LevelManager.player?._getGridPosition() ?? { x: 0, y: 0 };

      this.applyMovement(_deltaTime);

      switch (state) {
        case ZombieState.IDLE:
          this._animations.activeAnimations = [0];
          if (this._timers.movementRestart !== Infinity && this._timers.movementRestart >= 0) {
            const isCloseToPlayer = pgx >= gx - 1 && pgx <= gx + 1 && pgy >= gy - 1 && pgy <= gy + 1;
            if (!isCloseToPlayer) {
              this._setState(ZombieState.CHASING);
              this._timers.movementRestart = Infinity;
            }
          }
          break;

        case ZombieState.CHASING:
          this._animations.activeAnimations = [1];
          break;

        case ZombieState.ATTACKING:
          this._animations.activeAnimations = [2]; // TODO: This is not the correct animation
          break;

        case ZombieState.RETREATING:
          this._animations.activeAnimations = [1];

          // Damage in sunlight
          if (isInsideGrid(this._getGridPosition()) && LevelManager.getIsDay()) this._handleDamage(_deltaTime * 5.5);
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

      LevelManager.destroyEntity(this._entityId, EntityType.ENEMY);
    },
  };

  public startWaiting(): void {
    this._setState(ZombieState.IDLE);
    this._instance.desiredVelocity = 0;
  }

  public startChasingPlayer(): void {
    this._setState(ZombieState.CHASING);
    this._instance.desiredVelocity = this._attributes.maxSpeed;
  }

  public startRetreating(): void {
    this._setState(ZombieState.RETREATING);
    this._instance.desiredVelocity = this._attributes.maxSpeed * 3.25;
  }

  public startAttacking(): void {
    const { AssetManager } = _game.MANAGERS;

    if (this._timers.attackCooldown < 0) return;
    this._setState(ZombieState.ATTACKING);
    this._timers.attack = this._attributes.attackDuration * -1;
    this._instance.hasDealtDamage = false;

    AssetManager.playAudioAsset("AZombieAttack", "sound", 0.85);
  }

  // private applyAttack(_deltaTime: number): void {
  //   const zombieSettings = _game.MANAGERS.GameManager.getSettings().rules.zombie;
  //   const { hasDealtDamage, distanceFromPlayer } = this._instance;
  //   const { minDistanceFromPlayer } = this._attributes;
  //   const worldPos = this._getWorldPosition();
  //   const player = _game.MANAGERS.LevelManager.player;
  //
  //   if (!hasDealtDamage && !!player) {
  //     if (distanceFromPlayer < minDistanceFromPlayer) {
  //       player._handleDamage(zombieSettings.attackDamage);
  //       player.handlePhysicsPushback(
  //         getDirectionalAngle(player._getWorldPosition(), worldPos),
  //         zombieSettings.attackPushbackStr,
  //       );
  //       this._instance.hasDealtDamage = true;
  //     }
  //   }

  // Cool down and reset after the entire attack duration has passed
  //   if (this._timers.attack >= 0) {
  //     this._timers.attackCooldown = zombieSettings.attackCooldownSec * -1;
  //     this._setState(ZombieState.CHASING);
  //   }
  // }
  //
  private getSeparationVector(): Vector {
    const vector = { x: 0, y: 0 };

    if (this._getState() !== ZombieState.CHASING && this._getState() !== ZombieState.RETREATING) {
      return vector;
    }

    const { LevelManager } = _game.MANAGERS;
    const enemyGrid = LevelManager.getEnemyGrid();
    const { x: gx, y: gy } = this._getGridPosition();
    const selfWorldPos = this._getWorldPosition();

    if (!enemyGrid) return vector;

    const radius = GRID_CONFIG.TILE_SIZE * 2;

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        enemyGrid[gx + dx]?.[gy + dy]?.forEach((zombie) => {
          if (this === zombie) return;

          const worldPos = zombie._getWorldPosition();
          const dist = Math.hypot(selfWorldPos.x - worldPos.x, selfWorldPos.y - worldPos.y);

          if (dist === 0 || dist >= radius) return;

          const strength = (radius - dist) / radius;
          vector.x += ((selfWorldPos.x - worldPos.x) / dist) * strength;
          vector.y += ((selfWorldPos.y - worldPos.y) / dist) * strength;
        });
      }
    }

    return vector;
  }

  private applyMovement(_deltaTime: number): void {
    if (this._getState() !== ZombieState.CHASING && this._getState() !== ZombieState.RETREATING) return;

    const { LevelManager } = _game.MANAGERS;
    const player = LevelManager.player;
    const { flowField } = LevelManager;
    const { x, y } = this._getWorldPosition();
    const { x: gx, y: gy } = this._getGridPosition();
    const { velocity, direction, desiredVelocity } = this._instance;

    const flowFieldCurrentCell = flowField?.[gx]?.[gy];

    const flowFieldVector = flowFieldCurrentCell?.normalizedVector ?? { x: 0, y: 0 };
    const separationVector = this.getSeparationVector();
    const separationWeight = 0.3;

    const combined = {
      x: flowFieldVector.x + separationVector.x * separationWeight,
      y: flowFieldVector.y + separationVector.y * separationWeight,
    };
    const mag = Math.hypot(combined.x, combined.y);
    const normalizedVector = mag > 0 ? { x: combined.x / mag, y: combined.y / mag } : { x: 0, y: 0 };

    this._instance.velocity = lerp(velocity, desiredVelocity, _deltaTime * 4);
    const targetDirection = Math.atan2(normalizedVector.y, normalizedVector.x);
    this._instance.direction = lerpAngle(direction, targetDirection, _deltaTime * 7);

    const futurePos: WorldPosition = {
      x: x + Math.cos(this._instance.direction) * this._instance.velocity * _deltaTime,
      y: y + Math.sin(this._instance.direction) * this._instance.velocity * _deltaTime,
    };

    const futureGridPos = worldToGrid(futurePos);
    const enemyGrid = LevelManager.getEnemyGrid();
    if (
      !areVectorsEqual(futureGridPos, this._getGridPosition()) &&
      enemyGrid?.[futureGridPos.x]?.[futureGridPos.y]?.length
    ) {
      return;
    }

    if (futurePos.x < x) this._instance.isFacingLeft = true;
    else if (futurePos.x > x) this._instance.isFacingLeft = false;

    if (player) {
      const { x: pgx, y: pgy } = player._getGridPosition();
      // Do not move if 1 field next to player
      if (pgx >= gx - 1 && pgx <= gx + 1 && pgy >= gy - 1 && pgy <= gy + 1) {
        // TODO: Attack here I guess
        this._setState(ZombieState.IDLE);
        this._timers.movementRestart = -0.5;
      }
    }

    if (Math.abs(normalizedVector.x) < 0.5 && Math.abs(normalizedVector.y) < 0.5) {
      this._setState(ZombieState.IDLE);
      this._timers.movementRestart = -0.5;
    }

    this._setWorldPosition(futurePos);
  }
}
