import {
  GRID_CONFIG,
  type WorldPosition,
  type GridPosition,
  gridToWorld,
  worldToGrid,
} from "../../config/core/grid.config";
import type { AssetImageName } from "../../config/game/assets.config";
import type GameInstance from "../../GameInstance";
import { EntityType } from "../../types/EntityType";
import type { Vector } from "../../types/Vector";
import { ZIndex } from "../../types/ZIndex";
import assertNever from "../../utils/assertNever";
import { AnimatedSpriteSheet } from "../../utils/classes/AnimatedSpriteSheet";
import isInsideGrid from "../../utils/grid/isInsideGrid";
import getDirectionalAngle from "../../utils/math/getDirectionalAngle";
import getVectorDistance from "../../utils/math/getVectorDistance";
import radialLerp from "../../utils/math/radialLerp";
import radiansToVector from "../../utils/math/radiansToVector";
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

  private isWalking: boolean;
  private maxSpeed: number;
  private speed: number;
  private angle: number;
  private desiredAngle: number | undefined;
  private moveTargetPos: WorldPosition | undefined;

  private readonly clearTargetPosInterval: number = 1.5;
  private clearTargetPosTimer: number;
  private distanceFromPlayer: number = Infinity;
  private minDistanceFromPlayer: number;
  // private stunTimer: number = 0; TODO: Implement

  private retreatFlowFieldIndex: number;

  private attackCooldownTimer: number;
  private attackTimer: number;
  private readonly attackDuration: number = 0.4;
  private hasDealtDamage: boolean;

  constructor(gridPos: GridPosition, entityId: number, gameInstance: GameInstance) {
    super(gameInstance, gridToWorld(gridPos), entityId, true);
    const { AssetManager } = this.gameInstance.MANAGERS;

    const zombieSettings = this.gameInstance.MANAGERS.GameManager.getSettings().rules.zombie;
    this.health = zombieSettings.maxHealth + (Math.random() - 0.5) * zombieSettings.healthDeviation;

    this.isWalking = true;
    this.maxSpeed = zombieSettings.maxSpeed + (Math.random() - 0.5) * zombieSettings.speedDeviation;
    this.speed = this.maxSpeed;
    this.angle = 0;

    this.clearTargetPosTimer = 0; // FIXME: Remove
    this.minDistanceFromPlayer = zombieSettings.minDistanceFromPlayer;

    this.retreatFlowFieldIndex = 0; // FIXME: Remove

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
        if (this.gameInstance.MANAGERS.LevelManager.player)
          this.applyRotation(_deltaTime, this.gameInstance.MANAGERS.LevelManager.player.worldPos);
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
    const { DrawManager } = this.gameInstance.MANAGERS;
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
        ZIndex.ENTITIES,
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

    const retreatFlowFields = this.gameInstance.MANAGERS.LevelManager.retreatFlowFields;
    if (!retreatFlowFields) return;
    this.retreatFlowFieldIndex = this.entityId % retreatFlowFields.length;
  }

  public startWandering(): void {
    // this.zombieState = ZombieState.WANDERING;
    this.zombieState = ZombieState.RETREAT;
  }

  public getHealth(): number {
    return this.health;
  }

  public damage(amount: number): void {
    this.zombieState = ZombieState.HIT;
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
    if (!player) return;

    if (this.clearTargetPosTimer > 0) {
      this.clearTargetPosTimer -= _deltaTime;
    } else {
      this.clearTargetPosTimer = this.clearTargetPosInterval;
      this.moveTargetPos = undefined;
    }

    // Stop chasing the player once they're reached
    if (this.moveTargetPos) {
      const targetGridPos = worldToGrid(this.moveTargetPos);
      if (targetGridPos.x === this.gridPos.x && targetGridPos.y === this.gridPos.y) this.moveTargetPos = undefined;
      const isTargetPlayer = targetGridPos.x === player.gridPos.x && targetGridPos.y === player.gridPos.y;
      if (this.moveTargetPos && !isTargetPlayer) return;
    }

    if (isInsideGrid(this.gridPos) && this.distanceFromPlayer >= this.minDistanceFromPlayer && !!flowField) {
      const vector = flowField[this.gridPos.x][this.gridPos.y].normalizedVector;
      // if (currentDistance < flowField?.[vector.x]?.[vector.y]?.weight) {
      //   this.speed = 0;
      // } else {
      //   this.speed = this.maxSpeed;
      // }
      this.moveTargetPos = gridToWorld(
        { x: vector.x + this.gridPos.x, y: vector.y + this.gridPos.y },
        { center: true },
      );
    } else {
      this.moveTargetPos = { ...player.worldPos };
    }
  }

  private zombieRetreat(_deltaTime: number): void {
    const retreatFlowFields = this.gameInstance.MANAGERS.LevelManager.retreatFlowFields;
    const flowField = retreatFlowFields?.[this.retreatFlowFieldIndex];
    if (!flowField) return;

    this.moveTargetPos = undefined;

    if (!isInsideGrid(this.gridPos, GRID_CONFIG)) {
      this.zombieState = ZombieState.IDLE;
      this.gridPos.x = Math.floor(Math.random() * (GRID_CONFIG.GRID_WIDTH - 1));
      this.gridPos.y = Math.floor(Math.random() * (GRID_CONFIG.GRID_HEIGHT - 1));
      return;
    }

    // Reached any edge
    const { x, y } = this.gridPos;
    if (x <= 0 || x >= GRID_CONFIG.GRID_WIDTH - 1 || y <= 0 || y >= GRID_CONFIG.GRID_HEIGHT - 1) {
      const offsetX = x <= 0 ? -10 : x >= GRID_CONFIG.GRID_WIDTH - 1 ? 10 : 0;
      const offsetY = y <= 0 ? -10 : y >= GRID_CONFIG.GRID_HEIGHT - 1 ? 10 : 0;
      this.moveTargetPos = gridToWorld({ x: x + offsetX, y: y + offsetY }, { center: true });
      return;
    }

    // const currentDistance = flowField[this.gridPos.x][this.gridPos.y].weight;
    // this.moveTargetPos = gridToWorld(lowestDistanceNeighbor, { center: true });
  }

  private zombieAttackPlayer(_deltaTime: number): void {
    this.attackTimer -= _deltaTime;
    const zombieSettings = this.gameInstance.MANAGERS.GameManager.getSettings().rules.zombie;

    if (!this.hasDealtDamage && this.attackTimer <= this.attackDuration * 0.4) {
      const player = this.gameInstance.MANAGERS.LevelManager.player;
      if (player) {
        this.distanceFromPlayer = getVectorDistance(this.worldPos, player.worldPos);
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
    if (this.moveTargetPos) this.applyRotation(_deltaTime, this.moveTargetPos);

    const player = this.gameInstance.MANAGERS.LevelManager.player;
    // const zombieSettings = this.gameInstance.MANAGERS.GameManager.getSettings().rules.zombie;

    // Retreat
    if (this.zombieState === ZombieState.RETREAT) {
      this.zombieRetreat(_deltaTime);
      this.applyMovement(_deltaTime);
    }

    // Chase
    if (this.zombieState === ZombieState.WALK) {
      if (!player) return;
      if (!this.isWalking) return;

      this.distanceFromPlayer = getVectorDistance(this.worldPos, player.worldPos);

      if (this.attackCooldownTimer > 0) this.attackCooldownTimer -= _deltaTime;

      this.zombieChasePlayer(_deltaTime);

      if (this.distanceFromPlayer < this.minDistanceFromPlayer) {
        this.moveTargetPos = { ...player.worldPos };
        this.clearTargetPosTimer = 0;
        this.startAttacking();
      } else {
        this.applyMovement(_deltaTime);
      }
    }
  }

  private applyRotation(_deltaTime: number, targetPos: WorldPosition): void {
    this.desiredAngle = getDirectionalAngle(targetPos, this.worldPos);
    this.angle = this.desiredAngle;
    if (this.angle !== this.desiredAngle) {
      // const rotationSpeed = this.zombieState === ZombieState.WALK ? _deltaTime * 4.5 : _deltaTime * 19;
      // this.angle = radialLerp(this.angle, this.desiredAngle, Math.min(1, rotationSpeed));
    }
  }

  private applyMovement(_deltaTime: number): void {
    const vector = radiansToVector(this.angle); // TODO: Calculate less times if zombie amount scaling becomes perf bottleneck
    const futurePos = {
      x: this.worldPos.x + vector.x * this.speed * _deltaTime,
      y: this.worldPos.y + vector.y * this.speed * _deltaTime,
    };
    const adjustedPos = this.adjustMovementForCollisions(
      futurePos,
      this.gameInstance.MANAGERS.LevelManager.levelGrid,
      GRID_CONFIG,
      false,
    );
    this.setWorldPosition(adjustedPos);
    if (futurePos.x < this.worldPos.x) this.isFacingLeft = true;
    else if (futurePos.x > this.worldPos.x) this.isFacingLeft = false;
  }

  // Utils
  // ==================================================

  private drawDebug(): void {
    const settings = this.gameInstance.MANAGERS.GameManager.getSettings();

    if (this.moveTargetPos && isInsideGrid(this.gridPos) && settings.debug.showZombieTarget) {
      const safeWorldPos = gridToWorld(this.gridPos);

      this.gameInstance.MANAGERS.DrawManager.drawRectOutline(
        safeWorldPos.x,
        safeWorldPos.y,
        GRID_CONFIG.TILE_SIZE,
        GRID_CONFIG.TILE_SIZE,
        "#00aaeeaa",
      );

      this.gameInstance.MANAGERS.DrawManager.drawLine(
        safeWorldPos.x + GRID_CONFIG.TILE_SIZE / 2,
        safeWorldPos.y + GRID_CONFIG.TILE_SIZE / 2,
        this.moveTargetPos.x,
        this.moveTargetPos.y,
        "#00aaeeaa",
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
