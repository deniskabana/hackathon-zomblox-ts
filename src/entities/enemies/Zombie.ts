import { GRID_CONFIG, type GridPosition, gridToWorld } from "../../config/core/grid.config";
import type { AssetImageName } from "../../config/game/assets.config";
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
import AEnemy from "../abstract/AEnemy";

export enum ZombieState {
  IDLE = "IDLE",
  WALK = "WALK",
  ATTACK = "ATTACK",
  RETREAT = "RETREAT",
  KNOCKED = "KNOCKED",
  HIT = "HIT",
  DEAD = "DEAD",
}

export default class Zombie extends AEnemy {
  private zombieState: ZombieState = ZombieState.WALK;
  public health: number;

  private activeAnimation: AnimatedSpriteSheet | undefined;
  private zombieImageIndex: number;
  private animations: Record<Exclude<ZombieState, ZombieState.ATTACK | ZombieState.RETREAT>, AnimatedSpriteSheet[]>;
  private fps: number;

  private size: number = GRID_CONFIG.TILE_SIZE * 1.5;
  private isFacingLeft: boolean = false;

  private maxSpeed: number;
  private speed: number;
  /** Directional vector for zombie's movement */
  private vector: Vector | undefined;

  private distanceFromPlayer: number = Infinity;
  private minDistanceFromPlayer: number;
  // private stunTimer: number = 0; TODO: Implement
  // private retreatFlowFieldIndex: number;

  private attackCooldownTimer: number;
  private attackTimer: number;
  private readonly attackDuration: number = 0.4;
  private hasDealtDamage: boolean;

  constructor(gridPos: GridPosition, entityId: number, gameInstance: GameInstance) {
    super(gameInstance, gridToWorld(gridPos), entityId, true);
    const { AssetManager } = this.gameInstance.MANAGERS;

    const zombieSettings = this.gameInstance.MANAGERS.GameManager.getSettings().rules.zombie;
    this.health = zombieSettings.maxHealth + (Math.random() - 0.5) * zombieSettings.healthDeviation;

    this.maxSpeed = zombieSettings.maxSpeed + (Math.random() - 0.5) * zombieSettings.speedDeviation;
    this.speed = this.maxSpeed;

    this.minDistanceFromPlayer = zombieSettings.minDistanceFromPlayer;
    this.attackCooldownTimer = 0;
    this.attackTimer = 0;
    this.hasDealtDamage = false;

    this.fps = 8;
    this.zombieImageIndex = Math.floor(Math.random() * 4);

    this.animations = {
      [ZombieState.IDLE]: (["SZombie1Idle", "SZombie2Idle", "SZombie3Idle", "SZombie4Idle"] as AssetImageName[]).map(
        (name) => AnimatedSpriteSheet.fromGrid(AssetManager.getImageAsset(name)!, 32, 32, 6, this.fps),
      ),
      [ZombieState.WALK]: (["SZombie1Run", "SZombie2Run", "SZombie3Run", "SZombie4Run"] as AssetImageName[]).map(
        (name) => AnimatedSpriteSheet.fromGrid(AssetManager.getImageAsset(name)!, 32, 32, 8, this.fps),
      ),
      [ZombieState.KNOCKED]: (
        ["SZombie1Knocked", "SZombie2Knocked", "SZombie3Knocked", "SZombie4Knocked"] as AssetImageName[]
      ).map((name) => AnimatedSpriteSheet.fromGrid(AssetManager.getImageAsset(name)!, 32, 32, 6, this.fps)),
      [ZombieState.HIT]: (["SZombie1Hit", "SZombie2Hit", "SZombie3Hit", "SZombie4Hit"] as AssetImageName[]).map(
        (name) => AnimatedSpriteSheet.fromGrid(AssetManager.getImageAsset(name)!, 32, 32, 3, this.fps, false),
      ),
      [ZombieState.DEAD]: (
        ["SZombie1Death", "SZombie3Death", "SZombie3Death", "SZombie3Death"] as AssetImageName[]
      ).map((name) => AnimatedSpriteSheet.fromGrid(AssetManager.getImageAsset(name)!, 32, 32, 8, this.fps, false)),
    };

    this.activeAnimation = this.animations.IDLE[this.zombieImageIndex];
  }

  public update(_deltaTime: number) {
    this.activeAnimation?.update(Math.min(_deltaTime, 1 / this.fps));

    if (
      this.zombieState === ZombieState.RETREAT &&
      isInsideGrid(this.gridPos) &&
      this.gameInstance.MANAGERS.LevelManager.getIsDay()
    ) {
      this.damage(_deltaTime * 1.5);
    }

    switch (this.zombieState) {
      case ZombieState.WALK:
      case ZombieState.RETREAT:
        this.activeAnimation = this.animations.WALK[this.zombieImageIndex];
        this.applyChaseAndRetreat(_deltaTime);
        break;

      case ZombieState.ATTACK:
        this.activeAnimation = this.animations.WALK[this.zombieImageIndex];
        this.zombieAttackPlayer(_deltaTime);
        break;

      case ZombieState.IDLE:
        this.activeAnimation = this.animations.IDLE[this.zombieImageIndex];
        return;

      case ZombieState.DEAD:
        this.activeAnimation = this.animations.DEAD[this.zombieImageIndex];
        return;

      case ZombieState.HIT:
        this.activeAnimation = this.animations.HIT[this.zombieImageIndex];
        return;

      case ZombieState.KNOCKED:
        this.activeAnimation = this.animations.KNOCKED[this.zombieImageIndex];
        return;

      default:
        assertNever(this.zombieState);
    }
  }

  public draw() {
    this.drawDebug();
    if (!this.activeAnimation) return;
    const { DrawManager, GameManager } = this.gameInstance.MANAGERS;

    this.drawShadow(this.size * 0.75);
    DrawManager.queueDrawSprite(
      this.worldPos.x - this.size / 2,
      this.worldPos.y - this.size * 0.95,
      this.activeAnimation,
      this.activeAnimation.getCurrentFrame(),
      this.size,
      this.size,
      ZIndex.ENTITIES,
      0,
      1,
      this.isFacingLeft ? 1 : -1,
    );

    if (!GameManager.getSettings().debug.enableFlowFieldRender) return;
    const gridPos = gridToWorld(this.gridPos);
    DrawManager.drawRectOutline(gridPos.x, gridPos.y, GRID_CONFIG.TILE_SIZE, GRID_CONFIG.TILE_SIZE, "#a24", 3);
  }

  public drawShadow(size: number): void {
    const { DrawManager, AssetManager } = this.gameInstance.MANAGERS;

    const shadowSprite = AssetManager.getImageAsset("IFXEntityShadow");
    if (shadowSprite)
      DrawManager.queueDraw(
        this.worldPos.x - size / 2,
        this.worldPos.y - size / 1.75,
        shadowSprite,
        size,
        size,
        ZIndex.GROUND_EFFECTS,
      );
  }

  // State
  // ==================================================

  public startChasingPlayer(): void {
    this.zombieState = ZombieState.WALK;
    this.speed = this.maxSpeed;
  }

  public startRetreating(): void {
    this.zombieState = ZombieState.RETREAT;
    const zombieSettings = this.gameInstance.MANAGERS.GameManager.getSettings().rules.zombie;
    this.speed = zombieSettings.maxSpeed * 3.25;
    // TODO: Later
  }

  public startWandering(): void {
    // TODO: Later
    // this.zombieState = ZombieState.WANDERING;
    this.zombieState = ZombieState.RETREAT;
  }

  public getHealth(): number {
    return this.health;
  }

  public damage(amount: number): void {
    // TODO: Uncomment when KNOCKED and stunTimer is implemented in parent class
    // this.zombieState = ZombieState.HIT;
    this.speed = Math.floor(this.speed * 0.5 * 1000) / 1000;
    this.health -= amount;
    if (this.health <= 0) this.die();
  }

  private die(): void {
    this.gameInstance.MANAGERS.LevelManager.spawnCoin({
      x: this.worldPos.x / GRID_CONFIG.TILE_SIZE - 0.5,
      y: this.worldPos.y / GRID_CONFIG.TILE_SIZE - 0.5,
    });
    this.gameInstance.MANAGERS.AssetManager.playAudioAsset("AZombieDeath", "sound");
    this.gameInstance.MANAGERS.VFXManager.drawBloodPool({
      x: this.worldPos.x - GRID_CONFIG.TILE_SIZE / 2 + (-0.5 + Math.random()) * 4,
      y: this.worldPos.y - GRID_CONFIG.TILE_SIZE / 2 + (-0.5 + Math.random()) * 4,
    });
    this.gameInstance.MANAGERS.LevelManager.destroyEntity(this.entityId, EntityType.ENEMY);
  }

  // State based actions
  // ==================================================

  private zombieChasePlayer(_deltaTime: number): void {
    const player = this.gameInstance.MANAGERS.LevelManager.player;
    const flowField = this.gameInstance.MANAGERS.LevelManager.flowField;
    if (!player || !flowField) return;

    // Do not continue without flow field
    if (!flowField) return;

    if (isInsideGrid(this.gridPos) && this.distanceFromPlayer > this.minDistanceFromPlayer) {
      this.vector = flowField?.[this.gridPos.x]?.[this.gridPos.y]?.normalizedVector ?? { x: 0, y: 0 };
    } else {
      const safeX = clamp(1, this.gridPos.x, GRID_CONFIG.GRID_WIDTH - 2);
      const safeY = clamp(1, this.gridPos.y, GRID_CONFIG.GRID_HEIGHT - 2);
      this.vector = { x: safeX, y: safeY };
    }
  }

  private zombieAttackPlayer(_deltaTime: number): void {
    this.attackTimer -= _deltaTime;
    const zombieSettings = this.gameInstance.MANAGERS.GameManager.getSettings().rules.zombie;

    if (!this.hasDealtDamage && this.attackTimer <= this.attackDuration * 0.4) {
      const player = this.gameInstance.MANAGERS.LevelManager.player;
      if (player) {
        if (this.distanceFromPlayer < this.minDistanceFromPlayer) {
          player.damage(zombieSettings.attackDamage);
          player.pushbackForce(getDirectionalAngle(player.worldPos, this.worldPos), zombieSettings.attackPushbackStr);
          this.hasDealtDamage = true;
        }
      }
    }

    if (this.attackTimer <= 0) {
      this.attackCooldownTimer = zombieSettings.attackCooldownSec * (Math.random() + 0.5);
      if (this.zombieState === ZombieState.ATTACK) this.zombieState = ZombieState.WALK;
    }
  }

  // Actions
  // ==================================================

  private startAttacking(): void {
    if (this.attackCooldownTimer > 0) return;
    this.activeAnimation = this.animations.IDLE[this.zombieImageIndex];
    this.zombieState = ZombieState.ATTACK;
    this.attackTimer = this.attackDuration;
    this.hasDealtDamage = false;

    this.gameInstance.MANAGERS.AssetManager.playAudioAsset("AZombieAttack", "sound", 0.85);
  }

  // Movement
  // ==================================================

  private applyChaseAndRetreat(_deltaTime: number): void {
    const player = this.gameInstance.MANAGERS.LevelManager.player;

    if (this.zombieState === ZombieState.WALK) {
      if (!player) return;

      // TODO: Throttle calculation of distances
      this.distanceFromPlayer = getVectorDistance(this.worldPos, player.worldPos);
      this.zombieChasePlayer(_deltaTime);

      if (this.attackCooldownTimer > 0) this.attackCooldownTimer -= _deltaTime;
      if (this.distanceFromPlayer <= this.minDistanceFromPlayer) {
        this.vector = undefined;
        this.speed = 0;
        this.startAttacking();
      } else {
        this.applyMovement(_deltaTime);
      }
    }
  }

  private applyMovement(_deltaTime: number): void {
    if (!this.vector) return;
    const futureGridPos = {
      x: this.worldPos.x + this.vector.x * this.speed * _deltaTime,
      y: this.worldPos.y + this.vector.y * this.speed * _deltaTime,
    };
    this.setWorldPosition(futureGridPos);
    // WARN: Re-enable collisions if necessary (perf impact, only works with blocks)
    // const adjustedPos = this.adjustMovementForCollisions(
    //   futurePos,
    //   this.gameInstance.MANAGERS.LevelManager.levelGrid,
    //   GRID_CONFIG,
    //   false,
    // );
    // this.setWorldPosition(adjustedPos);

    if (futureGridPos.x < this.worldPos.x) this.isFacingLeft = true;
    else if (futureGridPos.x > this.worldPos.x) this.isFacingLeft = false;
  }

  // Utils
  // ==================================================

  private drawDebug(): void {
    const settings = this.gameInstance.MANAGERS.GameManager.getSettings();
    const player = this.gameInstance.MANAGERS.LevelManager.player;

    if (isInsideGrid(this.gridPos) && settings.debug.showZombieTarget && player) {
      this.gameInstance.MANAGERS.DrawManager.drawArrow(
        this.worldPos.x,
        this.worldPos.y,
        this.worldPos.x + GRID_CONFIG.TILE_SIZE * (this.vector?.x ?? 0),
        this.worldPos.y + GRID_CONFIG.TILE_SIZE * (this.vector?.y ?? 0),
        "#5070ff",
        2,
      );
    }

    if (settings.debug.showZombieState) {
      this.gameInstance.MANAGERS.DrawManager.drawText(
        this.zombieState,
        this.worldPos.x,
        this.worldPos.y - GRID_CONFIG.TILE_SIZE / 2,
        "#f89",
        10,
        "Arial",
        "center",
      );
    }
  }

  public destroy(): void {}
}
