import { GRID_CONFIG, type GridPosition, gridToWorld } from "../../config/core/grid.config";
import type { DEFAULT_SETTINGS } from "../../config/game/settings.config";
import type GameInstance from "../../GameInstance";
import type { AssetImage } from "../../types/Asset";
import { EntityType } from "../../types/EntityType";
import type { Vector } from "../../types/Vector";
import { ZIndex } from "../../types/ZIndex";
import assertNever from "../../utils/assertNever";
import { AnimatedSpriteSheet } from "../../utils/classes/AnimatedSpriteSheet";
import isInsideGrid from "../../utils/grid/isInsideGrid";
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
    const { AssetManager, GameManager } = _game.MANAGERS;
    const { maxSpeed, maxHealth, attackDuration, minDistanceFromPlayer } = GameManager.getSettings().rules.zombie;

    const size: number = GRID_CONFIG.TILE_SIZE * 1.5;
    const fps: number = 11;
    const timers: Timers = { attack: Infinity, attackCooldown: Infinity, deathAnimation: Infinity };

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
      AnimatedSpriteSheet.fromGrid(animationAssets[animIndex].idle!, fw, fh, frames.idle, fps),
      AnimatedSpriteSheet.fromGrid(animationAssets[animIndex].run!, fw, fh, frames.run, fps),
      AnimatedSpriteSheet.fromGrid(animationAssets[animIndex].knocked!, fw, fh, frames.knocked, fps),
      AnimatedSpriteSheet.fromGrid(animationAssets[animIndex].hit!, fw, fh, frames.hit, fps, false),
      AnimatedSpriteSheet.fromGrid(animationAssets[animIndex].death!, fw, fh, frames.death, fps, false),
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
    draw: () => {
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

    drawShadow: () => {
      const { DrawManager, AssetManager } = _game.MANAGERS;
      const { x, y } = this._getWorldPosition();
      const size = this._getSize();
      const shadowSprite = AssetManager.getImageAsset("IFXEntityShadow");
      if (!shadowSprite) return;
      DrawManager.queueDraw(x - size / 2, y - size / 1.75, shadowSprite, size, size, ZIndex.GROUND_EFFECTS);
    },

    drawDebug: () => {
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
      // if (debug.enableFlowFieldRender) {
      //   DrawManager.drawRectOutline(x, y, GRID_CONFIG.TILE_SIZE, GRID_CONFIG.TILE_SIZE, "#a24", 3);
      // }
    },

    destructor: () => {},

    update: (_deltaTime) => {
      const { LevelManager } = _game.MANAGERS;
      const state = this._getState();

      if (!LevelManager.getIsDay() && !!LevelManager.player && this._getState() !== ZombieState.CHASING)
        this.startChasingPlayer();

      this.applyMovement(_deltaTime);

      switch (state) {
        case ZombieState.IDLE:
          this._animations.activeAnimations = [0];
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

      LevelManager.destroyEntity(this._entityId, EntityType.ENEMY);
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

  private applyMovement(_deltaTime: number): void {
    if (this._getState() !== ZombieState.CHASING && this._getState() !== ZombieState.RETREATING) return;

    const { LevelManager } = _game.MANAGERS;
    const { flowField } = LevelManager;
    const { x, y } = this._getWorldPosition();
    const { x: gx, y: gy } = this._getGridPosition();
    const { speed } = this._instance;

    const flowFieldCurrentCell = flowField?.[gx]?.[gy];
    const normalizedVector = flowFieldCurrentCell?.normalizedVector ?? { x: 0, y: 0 };
    const futurePos = {
      x: x + normalizedVector.x * speed * _deltaTime,
      y: y + normalizedVector.y * speed * _deltaTime,
    };

    // Check collision
    // if flowFieldCurrentCell.

    this._setWorldPosition(futurePos);

    // Sprite orientation
    if (futurePos.x < x) this._instance.isFacingLeft = true;
    else if (futurePos.x > x) this._instance.isFacingLeft = false;
  }
}
