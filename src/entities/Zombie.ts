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

  private clearTargetPosInterval: number = 1.5;
  private clearTargetPosTimer: number = 0;

  private distanceFromPlayer: number = Infinity;
  private minDistanceFromPlayer: number;

  private stuckTimer: number = 0;
  private stuckThreshold: number = 1.5;
  private lastGridPos: GridPosition = { x: -1, y: -1 };
  private gridPosChangeTimer: number = 0;

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
        this.applyChaseAndRetreat(_deltaTime);
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
    this.speed = this.maxSpeed;
  }

  public startRetreating(): void {
    this.zombieState = ZombieState.REATREATING;
    const zombieSettings = this.gameInstance.MANAGERS.GameManager.getSettings().rules.zombie;
    this.speed = zombieSettings.maxSpeed * 3;
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

  private applyChaseAndRetreat(_deltaTime: number): void {
    const player = this.gameInstance.MANAGERS.LevelManager.player;
    const zombieSettings = this.gameInstance.MANAGERS.GameManager.getSettings().rules.zombie;

    if (!player) return;
    this.distanceFromPlayer = getVectorDistance(this.worldPos, player.worldPos);

    if (!this.isWalking) return;
    this.detectAndHandleStuck(_deltaTime);

    if (this.zombieState === ZombieState.CHASING_PLAYER) {
      this.zombieChasePlayer(_deltaTime);
      if (zombieSettings.enableErraticBehavior) this.applyErraticBehavior(_deltaTime);

      if (this.distanceFromPlayer < this.minDistanceFromPlayer) {
        this.moveTargetPos = { ...player.worldPos };
        this.clearTargetPosTimer = 0;
        return;
      } else {
        this.moveIfPossible(_deltaTime);
      }
    }

    if (this.zombieState === ZombieState.REATREATING) {
      this.zombieRetreat(_deltaTime);
      this.moveIfPossible(_deltaTime);
    }
  }

  private detectAndHandleStuck(_deltaTime: number): void {
    if (this.lastGridPos.x === this.gridPos.x && this.lastGridPos.y === this.gridPos.y) {
      this.gridPosChangeTimer += _deltaTime;
    } else {
      this.gridPosChangeTimer = 0;
      this.lastGridPos = { ...this.gridPos };
    }

    if (this.gridPosChangeTimer > this.stuckThreshold) {
      this.findAlternativeRoute();
      this.gridPosChangeTimer = 0;
    }
  }

  private findAlternativeRoute(): void {
    const flowField = this.gameInstance.MANAGERS.LevelManager.flowField;
    if (!flowField || !isInsideGrid(this.gridPos)) return;
    const neighbors = flowField[this.gridPos.x][this.gridPos.y].neighbors;

    const validNeighbors = neighbors
      .filter((n) => flowField[n.x]?.[n.y]?.distance !== Infinity)
      .sort((a, b) => {
        const distA = flowField[a.x][a.y].distance;
        const distB = flowField[b.x][b.y].distance;
        return distA - distB;
      });

    if (validNeighbors.length > 1) {
      const alternativeIndex = Math.min(1 + Math.floor(Math.random() * 2), validNeighbors.length - 1);
      const alternative = validNeighbors[alternativeIndex];
      this.moveTargetPos = gridToWorld(alternative, true);

      // Add extra deviation to unstick
      this.moveTargetPos.x += (Math.random() - 0.5) * GRID_CONFIG.TILE_SIZE * 0.8;
      this.moveTargetPos.y += (Math.random() - 0.5) * GRID_CONFIG.TILE_SIZE * 0.8;
    }
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
      if (this.angle !== this.desiredAngle) {
        const rotationSpeed = this.zombieState === ZombieState.CHASING_PLAYER ? _deltaTime * 4.5 : _deltaTime * 19;
        this.angle = radialLerp(this.angle, this.desiredAngle, Math.min(1, rotationSpeed));
      }
    }
  }

  private moveIfPossible(_deltaTime: number): void {
    const vector = radiansToVector(this.angle); // TODO: Calculate less times if zombie amount scaling becomes perf bottleneck
    const futurePos = {
      x: this.worldPos.x + vector.x * this.speed * _deltaTime,
      y: this.worldPos.y + vector.y * this.speed * _deltaTime,
    };

    if (this.checkHasCollisions(futurePos)) {
      this.stuckTimer += _deltaTime;
    } else {
      this.setWorldPosition(futurePos);
      this.stuckTimer = 0;
    }
  }

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
      const bestValueNeighbor = flowField[this.gridPos.x][this.gridPos.y].neighbors.reduce<Vector>((acc, val) => {
        if (!acc || flowField[val.x][val.y].distance < flowField[acc.x][acc.y].distance) return val;
        return acc;
      }, this.gridPos);

      this.moveTargetPos = gridToWorld(bestValueNeighbor, true);
    } else {
      this.moveTargetPos = { ...player.worldPos };
    }

    // Add deviation for zombie-like walking
    if (this.moveTargetPos) {
      this.moveTargetPos.x += (0.5 - Math.random()) * GRID_CONFIG.TILE_SIZE * 0.6;
      this.moveTargetPos.y += (0.5 - Math.random()) * GRID_CONFIG.TILE_SIZE * 0.6;
    }
  }

  private zombieRetreat(_deltaTime: number): void {
    const flowField = this.gameInstance.MANAGERS.LevelManager.flowField;
    if (!flowField) return;

    const { x, y } = this.gridPos;
    if (x <= 0 || x >= GRID_CONFIG.GRID_WIDTH - 1 || y <= 0 || y >= GRID_CONFIG.GRID_HEIGHT - 1) {
      const offsetX = x <= 0 ? -1 : x >= GRID_CONFIG.GRID_WIDTH - 1 ? 1 : 0;
      const offsetY = y <= 0 ? -1 : y >= GRID_CONFIG.GRID_HEIGHT - 1 ? 1 : 0;
      this.moveTargetPos = gridToWorld({ x: x + offsetX, y: y + offsetY }, true);
      return;
    }

    if (!isInsideGrid(this.gridPos)) {
      this.zombieState = ZombieState.WAITING;
      return;
    }

    const lowestDistanceNeighbor = flowField[this.gridPos.x][this.gridPos.y].neighbors.reduce<Vector>((acc, val) => {
      if (flowField[val.x][val.y].distance === Infinity) return acc;
      if (!acc || flowField[val.x][val.y].distance < flowField[acc.x][acc.y].distance) return val;
      return acc;
    }, this.gridPos);

    this.moveTargetPos = gridToWorld(lowestDistanceNeighbor, true);
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
