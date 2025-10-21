import { GRID_CONFIG, gridToWorld, worldToGrid, type GridPosition, type WorldPosition } from "../config/gameGrid";
import type GameInstance from "../GameInstance";
import type { Vector } from "../types/Vector";
import { ZIndex } from "../types/ZIndex";
import assertNever from "../utils/assertNever";
import isInsideGrid from "../utils/grid/isInsideGrid";
import getDirectionalAngle from "../utils/math/getDirectionalAngle";
import getVectorDistance from "../utils/math/getVectorDistance";
import radialLerp from "../utils/math/radialLerp";
import radiansToVector from "../utils/math/radiansToVector";
import AEntity from "./abstract/AEntity";

export enum ZombieState {
  CHASING_PLAYER = "CHASING_PLAYER",
  WANDERING = "WANDERING", // TBD
  ATTACKING = "ATTACKING",
  REATREATING = "RETREATING",
  WAITING_FOR_NIGHT = "WAITING_FOR_NIGHT",
}

export default class Zombie extends AEntity {
  private zombieState: ZombieState = ZombieState.CHASING_PLAYER;
  public health: number;

  private isWalking: boolean;
  private maxSpeed: number;
  private speed: number;
  private angle: number;
  private desiredAngle: number | undefined;
  private moveTargetPos: WorldPosition | undefined;

  private randomStopInterval: number;
  private randomStopTimer: number;
  private readonly clearTargetPosInterval: number = 1.5;
  private clearTargetPosTimer: number;
  private distanceFromPlayer: number = Infinity;
  private minDistanceFromPlayer: number;

  private retreatFlowFieldIndex: number;

  private attackCooldownTimer: number;
  private attackTimer: number;
  private readonly attackDuration: number = 0.4;
  private hasDealtDamage: boolean;

  constructor(gridPos: GridPosition, entityId: number, gameInstance: GameInstance) {
    super(gameInstance, gridToWorld(gridPos), entityId, true);
    const zombieSettings = this.gameInstance.MANAGERS.GameManager.getSettings().rules.zombie;

    this.health = zombieSettings.maxHealth + (Math.random() - 0.5) * zombieSettings.healthDeviation;

    this.isWalking = true;
    this.maxSpeed = zombieSettings.maxSpeed + (Math.random() - 0.5) * zombieSettings.speedDeviation;
    this.speed = this.maxSpeed;
    this.angle = 0;

    this.randomStopInterval = zombieSettings.randomStopIntervalSec;
    this.randomStopTimer = 0;
    this.clearTargetPosTimer = 0;
    this.minDistanceFromPlayer = zombieSettings.minDistanceFromPlayer;

    this.retreatFlowFieldIndex = 0;

    this.attackCooldownTimer = 0;
    this.attackTimer = 0;
    this.hasDealtDamage = false;
  }

  public update(_deltaTime: number) {
    switch (this.zombieState) {
      case ZombieState.CHASING_PLAYER:
      case ZombieState.REATREATING:
        this.applyChaseAndRetreat(_deltaTime);
        break;

      case ZombieState.WANDERING:
        // TODO: Zombie wandering / wasting time
        break;

      case ZombieState.ATTACKING:
        if (this.gameInstance.MANAGERS.LevelManager.player)
          this.applyRotation(_deltaTime, this.gameInstance.MANAGERS.LevelManager.player.worldPos);
        this.zombieAttackPlayer(_deltaTime);
        break;

      case ZombieState.WAITING_FOR_NIGHT:
        return;

      default:
        assertNever(this.zombieState);
    }
  }

  public draw() {
    this.drawDebug();
    const sprite = this.gameInstance.MANAGERS.AssetManager.getImageAsset("IZombie1");
    if (!sprite) return;

    this.gameInstance.MANAGERS.DrawManager.queueDraw(
      this.worldPos.x - GRID_CONFIG.TILE_SIZE / 2,
      this.worldPos.y - GRID_CONFIG.TILE_SIZE / 2,
      sprite,
      GRID_CONFIG.TILE_SIZE,
      GRID_CONFIG.TILE_SIZE,
      ZIndex.ENTITIES,
      this.angle + Math.PI / 2,
      this.zombieState === ZombieState.ATTACKING ? 0.5 : 1,
    );
  }

  // State
  // ==================================================

  public startChasingPlayer(): void {
    this.zombieState = ZombieState.CHASING_PLAYER;
    this.speed = this.maxSpeed;
  }

  public startRetreating(): void {
    this.zombieState = ZombieState.REATREATING;
    const zombieSettings = this.gameInstance.MANAGERS.GameManager.getSettings().rules.zombie;
    this.speed = zombieSettings.maxSpeed * 2;

    const retreatFlowFields = this.gameInstance.MANAGERS.LevelManager.retreatFlowFields;
    if (!retreatFlowFields) return;
    this.retreatFlowFieldIndex = this.entityId % retreatFlowFields.length;
  }

  public startWandering(): void {
    // this.zombieState = ZombieState.WANDERING;
    this.zombieState = ZombieState.REATREATING;
  }

  public getHealth(): number {
    return this.health;
  }

  public damage(amount: number): void {
    this.health -= amount;
    if (this.health <= 0) this.die();
  }

  private die(): void {
    this.gameInstance.MANAGERS.AssetManager.playAudioAsset("AZombieDeath", "sound");
    this.gameInstance.MANAGERS.VFXManager.drawBloodPool(this.worldPos);
    this.gameInstance.MANAGERS.LevelManager.destroyEntity(this.entityId, "zombie");
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
    if (isInsideGrid(this.gridPos) && this.moveTargetPos) {
      const targetGridPos = worldToGrid(this.moveTargetPos);
      if (targetGridPos.x === this.gridPos.x && targetGridPos.y === this.gridPos.y) this.moveTargetPos = undefined;
      const isTargetPlayer = targetGridPos.x === player.gridPos.x && targetGridPos.y === player.gridPos.y;
      if (this.moveTargetPos && !isTargetPlayer) return;
    }

    if (isInsideGrid(this.gridPos) && this.distanceFromPlayer >= this.minDistanceFromPlayer && !!flowField) {
      const currentDistance = flowField[this.gridPos.x][this.gridPos.y].distance;

      const lowestDistanceNeighbor = flowField[this.gridPos.x][this.gridPos.y].neighbors.reduce<Vector>((acc, val) => {
        const neighborDist = flowField[val.x][val.y].distance;

        if (neighborDist < currentDistance && currentDistance - neighborDist <= 2) {
          if (neighborDist < flowField[acc.x][acc.y].distance) return val;
        }

        return acc;
      }, this.gridPos);

      this.moveTargetPos = gridToWorld(lowestDistanceNeighbor, true);
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
      this.zombieState = ZombieState.WAITING_FOR_NIGHT;
      this.gridPos.x = Math.floor(Math.random() * (GRID_CONFIG.GRID_WIDTH - 1));
      this.gridPos.y = Math.floor(Math.random() * (GRID_CONFIG.GRID_HEIGHT - 1));
      return;
    }

    // Reached any edge
    const { x, y } = this.gridPos;
    if (x <= 0 || x >= GRID_CONFIG.GRID_WIDTH - 1 || y <= 0 || y >= GRID_CONFIG.GRID_HEIGHT - 1) {
      const offsetX = x <= 0 ? -10 : x >= GRID_CONFIG.GRID_WIDTH - 1 ? 10 : 0;
      const offsetY = y <= 0 ? -10 : y >= GRID_CONFIG.GRID_HEIGHT - 1 ? 10 : 0;
      this.moveTargetPos = gridToWorld({ x: x + offsetX, y: y + offsetY }, true);
      return;
    }

    const currentDistance = flowField[this.gridPos.x][this.gridPos.y].distance;

    const lowestDistanceNeighbor = flowField[this.gridPos.x][this.gridPos.y].neighbors.reduce<Vector>((acc, val) => {
      const neighborDist = flowField[val.x][val.y].distance;

      if (neighborDist < currentDistance && currentDistance - neighborDist <= 2) {
        if (neighborDist < flowField[acc.x][acc.y].distance) return val;
      }

      return acc;
    }, this.gridPos);

    this.moveTargetPos = gridToWorld(lowestDistanceNeighbor, true);
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
      if (this.zombieState === ZombieState.ATTACKING) this.zombieState = ZombieState.CHASING_PLAYER;
    }
  }

  // Actions
  // ==================================================

  private startAttacking(): void {
    if (this.attackCooldownTimer > 0) return;
    this.zombieState = ZombieState.ATTACKING;
    this.attackTimer = this.attackDuration;
    this.hasDealtDamage = false;

    this.gameInstance.MANAGERS.AssetManager.playAudioAsset("AZombieAttack", "sound", 0.85);
  }

  // Movement
  // ==================================================

  private applyChaseAndRetreat(_deltaTime: number): void {
    if (this.moveTargetPos) this.applyRotation(_deltaTime, this.moveTargetPos);

    const player = this.gameInstance.MANAGERS.LevelManager.player;
    const zombieSettings = this.gameInstance.MANAGERS.GameManager.getSettings().rules.zombie;

    // Retreat
    if (this.zombieState === ZombieState.REATREATING) {
      this.zombieRetreat(_deltaTime);
      this.moveZombie(_deltaTime);
    }

    // Chase
    if (this.zombieState === ZombieState.CHASING_PLAYER) {
      if (!player) return;
      if (!this.isWalking) return;

      this.distanceFromPlayer = getVectorDistance(this.worldPos, player.worldPos);

      if (this.attackCooldownTimer > 0) this.attackCooldownTimer -= _deltaTime;

      this.zombieChasePlayer(_deltaTime);
      if (zombieSettings.enableErraticBehavior && this.distanceFromPlayer > this.minDistanceFromPlayer * 10)
        this.applyErraticBehavior(_deltaTime);

      if (this.distanceFromPlayer < this.minDistanceFromPlayer) {
        this.moveTargetPos = { ...player.worldPos };
        this.clearTargetPosTimer = 0;
        this.startAttacking();
      } else {
        this.moveZombie(_deltaTime);
      }
    }
  }

  private applyRotation(_deltaTime: number, targetPos: WorldPosition): void {
    this.desiredAngle = getDirectionalAngle(targetPos, this.worldPos);
    if (this.angle !== this.desiredAngle) {
      const rotationSpeed = this.zombieState === ZombieState.CHASING_PLAYER ? _deltaTime * 4.5 : _deltaTime * 19;
      this.angle = radialLerp(this.angle, this.desiredAngle, Math.min(1, rotationSpeed));
    }
  }

  private moveZombie(_deltaTime: number): void {
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
  }

  private applyErraticBehavior(_deltaTime: number): void {
    if (this.randomStopTimer > 0) {
      this.randomStopTimer -= _deltaTime;
    } else {
      this.randomStopTimer = this.randomStopInterval * (0.3 + Math.random() * 0.7);
    }
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
}
