import { GRID_CONFIG, gridToWorld, worldToGrid, type GridPosition, type WorldPosition } from "../config/gameGrid";
import type GameInstance from "../GameInstance";
import { GridTileState } from "../types/Grid";
import type { Vector } from "../types/Vector";
import { ZIndex } from "../types/ZIndex";
import assertNever from "../utils/assertNever";
import isInsideGrid from "../utils/grid/isInsideGrid";
import { clamp } from "../utils/math/clamp";
import getDirectionalAngle from "../utils/math/getDirectionalAngle";
import getVectorDistance from "../utils/math/getVectorDistance";
import radialLerp from "../utils/math/radialLerp";
import radiansToVector from "../utils/math/radiansToVector";
import AEntity from "./abstract/AEntity";

// TODO: Implement zombie behavior
export enum ZombieState {
  CHASING_PLAYER = "CHASING_PLAYER",
  WANDERING = "WANDERING", // TBD
  ATTACKING = "ATTACKING",
  REATREATING = "RETREATING",
  WAITING = "WAITING",
}

export default class Zombie extends AEntity {
  private zombieState: ZombieState = ZombieState.CHASING_PLAYER;
  public health: number;

  private isWalking: boolean;
  private speed: number;
  private maxSpeed: number;
  private angle: number = 0;
  private desiredAngle: number | undefined;
  private moveTargetPos: WorldPosition | undefined;

  private randomStopInterval: number;
  private randomStopTimer: number = 0;

  private clearTargetPosInterval: number = 5;
  private clearTargetPosTimer: number = 0;

  private distanceFromPlayer: number = Infinity;
  private minDistanceFromPlayer: number;

  constructor(gridPos: GridPosition, entityId: number, gameInstance: GameInstance) {
    super(gameInstance, gridToWorld(gridPos), entityId, true);

    this.isWalking = true;
    this.minDistanceFromPlayer = GRID_CONFIG.TILE_SIZE * 1.5;

    const settings = this.gameInstance.MANAGERS.GameManager.getSettings().rules.zombie;
    this.health = settings.maxHealth + (Math.random() - 0.5) * settings.healthDeviation;
    this.maxSpeed = settings.maxSpeed + (Math.random() - 0.5) * settings.speedDeviation;
    this.speed = this.maxSpeed;
    this.randomStopInterval = settings.randomStopIntervalSec;
  }

  public update(_deltaTime: number) {
    this.applyRotation(_deltaTime);

    switch (this.zombieState) {
      case ZombieState.CHASING_PLAYER:
      case ZombieState.REATREATING:
        this.applyZombieMovement(_deltaTime);
        break;

      case ZombieState.WANDERING:
        // TODO: Zombie wandering / wasting time
        break;

      case ZombieState.ATTACKING:
        // TODO: Zombie attack
        break;

      case ZombieState.WAITING:
        return; // ... just waiting

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
    );
  }

  // State
  // ==================================================

  public startChasingPlayer(): void {
    this.zombieState = ZombieState.CHASING_PLAYER;
  }

  public startRetreating(): void {
    this.zombieState = ZombieState.REATREATING;
  }

  public getHealth(): number {
    return this.health;
  }

  public damage(amount: number): void {
    this.health -= amount;
    if (this.health <= 0) {
      this.gameInstance.MANAGERS.AssetManager.playAudioAsset("AZombieDeath", "sound");
      this.gameInstance.MANAGERS.LevelManager.destroyEntity(this.entityId, "zombie");
    }
  }

  // Movement
  // ==================================================

  private applyZombieMovement(_deltaTime: number): void {
    const player = this.gameInstance.MANAGERS.LevelManager.player;
    if (player) this.distanceFromPlayer = getVectorDistance(this.worldPos, player.worldPos);

    if (!this.isWalking) return;
    if (this.zombieState === ZombieState.CHASING_PLAYER && this.distanceFromPlayer < this.minDistanceFromPlayer) {
      this.moveTargetPos = this.gameInstance.MANAGERS.LevelManager.player?.worldPos;
      this.clearTargetPosTimer = 0;
      return;
    }

    this.updateMoveTarget(_deltaTime);
    const settings = this.gameInstance.MANAGERS.GameManager.getSettings().rules.zombie;
    this.updatePosition(_deltaTime);
    if (settings.enableErraticBehavior) this.applyErraticBehavior(_deltaTime);
  }

  private checkHasCollisions(futurePos: WorldPosition): boolean {
    const levelGrid = this.gameInstance.MANAGERS.LevelManager.levelGrid;
    if (!levelGrid) return false;
    const gridPos = worldToGrid(futurePos);
    if (levelGrid[gridPos.x]?.[gridPos.y]?.state === GridTileState.BLOCKED) return true;
    return false;
  }

  private applyRotation(_deltaTime: number): void {
    if (this.moveTargetPos) {
      this.desiredAngle = getDirectionalAngle(this.moveTargetPos, this.worldPos);
      if (this.angle !== this.desiredAngle)
        this.angle = radialLerp(this.angle, this.desiredAngle, Math.min(1, _deltaTime * 3.5));
    }
  }

  private updatePosition(_deltaTime: number): void {
    const vector = radiansToVector(this.angle); // TODO: Calculate less times if zombie amount scaling becomes perf bottleneck
    const futurePos = {
      x: this.worldPos.x + vector.x * this.speed * _deltaTime,
      y: this.worldPos.y + vector.y * this.speed * _deltaTime,
    };
    if (!this.checkHasCollisions(futurePos)) this.setWorldPosition(futurePos);
  }

  private updateMoveTarget(_deltaTime: number): void {
    if (this.clearTargetPosTimer > 0) this.clearTargetPosTimer -= _deltaTime;
    else {
      this.clearTargetPosTimer = this.clearTargetPosInterval;
      this.moveTargetPos = undefined;
    }

    const player = this.gameInstance.MANAGERS.LevelManager.player;
    const isInside = isInsideGrid(this.gridPos);

    if (!player) return;

    if (isInside && this.moveTargetPos) {
      const targetGridPos = worldToGrid(this.moveTargetPos);
      if (targetGridPos.x === this.gridPos.x && targetGridPos.y === this.gridPos.y) this.moveTargetPos = undefined;

      const isTargetPlayer = targetGridPos.x === player.gridPos.x && targetGridPos.y === player.gridPos.y;
      if (this.moveTargetPos && !isTargetPlayer) return;
    }

    const playerPos = player.worldPos;
    const flowField = this.gameInstance.MANAGERS.LevelManager.flowField;
    const shouldCheckFlowField =
      this.zombieState === ZombieState.CHASING_PLAYER ? this.distanceFromPlayer >= this.minDistanceFromPlayer : true;

    if (isInside && flowField && shouldCheckFlowField) {
      const fieldCell = flowField[this.gridPos.x][this.gridPos.y];

      const bestValueNeighbor = fieldCell.neighbors.reduce<Vector>((acc, val) => {
        if (this.zombieState === ZombieState.CHASING_PLAYER) {
          if (!acc || flowField[val.x][val.y].distance < flowField[acc.x][acc.y].distance) return val;
        }
        if (this.zombieState === ZombieState.REATREATING) {
          if (flowField[val.x][val.y].distance === Infinity) return acc;
          if (!acc || flowField[val.x][val.y].distance > flowField[acc.x][acc.y].distance) return val;
        }
        return acc;
      }, this.gridPos);

      this.moveTargetPos = gridToWorld(bestValueNeighbor, true);
      // Add deviation for zombie-like walking
      this.moveTargetPos.x += (0.5 - Math.random()) * GRID_CONFIG.TILE_SIZE * 0.6;
      this.moveTargetPos.y += (0.5 - Math.random()) * GRID_CONFIG.TILE_SIZE * 0.6;
    } else {
      this.moveTargetPos = playerPos;
    }
  }

  private applyErraticBehavior(_deltaTime: number): void {
    if (this.randomStopTimer > 0) {
      this.randomStopTimer -= _deltaTime;
    } else {
      if (Math.random() > 0.3) this.speed *= 0.2 + Math.random();
      this.randomStopTimer = this.randomStopInterval * (0.3 + Math.random() * 0.7);
      setTimeout(
        () => {
          this.speed = this.maxSpeed;
        },
        clamp(200, Math.random() * 80 * this.distanceFromPlayer, this.randomStopTimer * 0.5),
      );
    }
  }

  // Utils
  // ==================================================

  private drawDebug(): void {
    const settings = this.gameInstance.MANAGERS.GameManager.getSettings();
    if (this.moveTargetPos && isInsideGrid(this.gridPos) && settings.debug.enableFlowFieldRender) {
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
  }
}
