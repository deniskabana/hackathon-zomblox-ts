import { GRID_CONFIG, gridToWorld, worldToGrid, type WorldPosition } from "../../../config/core/grid.config";
import type GameInstance from "../../../GameInstance";
import type { Vector } from "../../../types/lib/Vector";
import { ZIndex } from "../../../types/lib/ZIndex";
import assertNever from "../../../utils/assertNever";
import { GridTileState } from "../../../utils/grid/generateMapBlockGrid";
import isInsideGrid from "../../../utils/grid/isInsideGrid";
import areVectorsEqual from "../../../utils/math/areVectorsEqual";
import lerp from "../../../utils/math/lerp";
import { lerpAngle } from "../../../utils/math/radialLerp";
import AEntity, { type AEntityEngineBody, type EntityConstructorProps } from "../../engine/AEntity";
import type { EntityAnimationsSpecs } from "../../engine/systems/EntityAnimation";
import { EntityCollisionShape } from "../../engine/systems/EntityCollisionPoints";
import { EntityTimer } from "../../engine/systems/EntityTimer";

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
  attackCooldown: EntityTimer<"Cooldown between attacks">;
  attack: EntityTimer<"Attacking state duration">;
  deathAnimation: EntityTimer<"Lets zombie finish death animation before destruction">;
  movementRestart: EntityTimer<"Throttle restarting movement after stopping">;
  facingDirection: EntityTimer<"Throttle facing direction changes">;
  hitState: EntityTimer<"How long zombie stays in HIT state">;
}

interface Instance {
  hasDealtDamage: boolean;
  isFacingLeft: boolean;
  distanceFromPlayer: number;

  maxSpeed: number;
  desiredVelocity: number;
  movementDirection: number;
  movementVelocity: number;

  movementSeparationVector: Vector;
  movementGridDensity: number;
  movementFlowFieldVector: Vector;
}

export default class Zombie extends AEntity<ZombieState, Instance, Timers> {
  constructor({ gameInstance, entityId, gridPos }: EntityConstructorProps) {
    _game = gameInstance;
    const { AssetManager, SettingsManager, LevelManager } = _game.MANAGERS;
    const settings = SettingsManager.getSettings().zombie;

    const timers: Timers = {
      attack: new EntityTimer({ initialValue: settings.attackDurationSec, autoStart: false }),
      attackCooldown: new EntityTimer({ initialValue: settings.attackCooldownSec, autoStart: false }),
      deathAnimation: new EntityTimer({ initialValue: 1, autoStart: false }),
      movementRestart: new EntityTimer({ initialValue: settings.movementRestartSec, autoStart: false }),
      facingDirection: new EntityTimer({ initialValue: settings.facingDirThrottleSec, autoStart: false }),
      hitState: new EntityTimer({ initialValue: settings.hitStateDurationSec }),
    };

    const animations: EntityAnimationsSpecs = {
      frameWidth: 32,
      frameHeight: 32,
      activeVariant: Math.floor(Math.random() * 4),
      fps: 8,
      animations: [
        {
          id: "idle",
          frameCount: 6,
          fps: 4,
          assetVariants: [
            AssetManager.getImageAsset("SZombie1Idle")!,
            AssetManager.getImageAsset("SZombie2Idle")!,
            AssetManager.getImageAsset("SZombie3Idle")!,
            AssetManager.getImageAsset("SZombie4Idle")!,
          ],
        },
        {
          id: "run",
          frameCount: 8,
          assetVariants: [
            AssetManager.getImageAsset("SZombie1Run")!,
            AssetManager.getImageAsset("SZombie2Run")!,
            AssetManager.getImageAsset("SZombie3Run")!,
            AssetManager.getImageAsset("SZombie4Run")!,
          ],
        },
        {
          id: "knocked",
          frameCount: 6,
          assetVariants: [
            AssetManager.getImageAsset("SZombie1Knocked")!,
            AssetManager.getImageAsset("SZombie2Knocked")!,
            AssetManager.getImageAsset("SZombie3Knocked")!,
            AssetManager.getImageAsset("SZombie4Knocked")!,
          ],
        },
        {
          id: "hit",
          frameCount: 3,
          assetVariants: [
            AssetManager.getImageAsset("SZombie1Hit")!,
            AssetManager.getImageAsset("SZombie2Hit")!,
            AssetManager.getImageAsset("SZombie3Hit")!,
            AssetManager.getImageAsset("SZombie4Hit")!,
          ],
        },
        {
          id: "death",
          loop: false,
          frameCount: 8,
          fps: 10,
          assetVariants: [
            AssetManager.getImageAsset("SZombie1DeathAlt")!,
            AssetManager.getImageAsset("SZombie2DeathAlt")!,
            AssetManager.getImageAsset("SZombie3Death")!,
            AssetManager.getImageAsset("SZombie4Death")!,
          ],
        },
      ],
    };

    const instance: Instance = {
      maxSpeed: settings.maxSpeed,
      movementDirection: 0,
      movementVelocity: 0,
      desiredVelocity: 0,
      movementFlowFieldVector: { x: 0, y: 0 },
      movementGridDensity: 0,
      movementSeparationVector: { x: 0, y: 0 },
      hasDealtDamage: false,
      isFacingLeft: false,
      distanceFromPlayer: Infinity,
    };

    const colliderWidth = settings.worldSize * 0.25;
    const colliderHeight = settings.worldSize * 0.5;
    const colliderOffsetY = -GRID_CONFIG.TILE_SIZE * 0.25;

    super({
      worldPos: gridToWorld(gridPos),
      size: settings.worldSize,
      entityId,
      animations,
      collisionPoints: EntityCollisionShape.GetRectangle(
        { x: -colliderWidth / 2, y: -colliderHeight / 2 + colliderOffsetY },
        { x: colliderWidth / 2, y: colliderHeight / 2 + colliderOffsetY },
      ),
      initialState: ZombieState.CHASING,
      timers,
      health: settings.maxHealth,
      instance,
    });

    // Starting behavior based on gameplay loop - day / night
    if (LevelManager.getIsDay()) this.startRetreating();
    else this.startChasingPlayer();
  }

  public _engine: AEntityEngineBody = {
    draw: () => {
      const { DrawManager } = _game.MANAGERS;
      const size = this._getSize();
      this._animations?.drawActiveAnimations(this._getWorldPosition(), size, DrawManager, {
        scaleX: this._instance.isFacingLeft ? 1 : -1,
        offset: { x: 0, y: -this._getSize() * 0.35 },
      });
    },

    drawShadow: () => {
      const { DrawManager, AssetManager, LevelManager } = _game.MANAGERS;
      const { x, y } = this._getWorldPosition();
      const size = this._getSize() * 0.75;
      const shadowSprite = AssetManager.getImageAsset("IFXEntityShadow");

      if (!shadowSprite || LevelManager.getIsDay()) return;

      DrawManager.queueDraw(x - size / 2, y - size * 0.55, shadowSprite, size, size, ZIndex.GROUND_EFFECTS);
    },

    drawDebug: () => {
      const { SettingsManager, DrawManager } = _game.MANAGERS;
      const settings = SettingsManager.getSettings().zombie;
      const { x, y } = this._getWorldPosition();
      const { TILE_SIZE } = GRID_CONFIG;

      if (settings.debugDrawFlowFieldVector) {
        DrawManager.drawArrow(
          x,
          y,
          x + (TILE_SIZE * this._instance.movementFlowFieldVector.x) / 2,
          y + (TILE_SIZE * this._instance.movementFlowFieldVector.y) / 2,
          "#10a05f",
          2,
        );
      }

      if (settings.debugDrawFlowFieldVector) {
        DrawManager.drawArrow(
          x,
          y,
          x + Math.cos(this._instance.movementDirection) * TILE_SIZE,
          y + Math.sin(this._instance.movementDirection) * TILE_SIZE,
          "#ff90a0",
          2,
        );
      }

      if (settings.debugDrawSeparationVector) {
        DrawManager.drawArrow(
          x,
          y,
          x + TILE_SIZE * this._instance.movementSeparationVector.x,
          y + TILE_SIZE * this._instance.movementSeparationVector.y,
          "#a090ff",
          2,
        );
      }

      if (settings.debugDrawState) {
        DrawManager.drawText(this._getState(), x + 1, y + 1 - TILE_SIZE, "#000", 11, "Arial", "center");
        DrawManager.drawText(this._getState(), x, y - TILE_SIZE, "#f89", 11, "Arial", "center");
      }

      if (settings.debugDrawPosition) {
        DrawManager.drawLine(x - TILE_SIZE / 2, y - TILE_SIZE / 2, x + TILE_SIZE / 2, y + TILE_SIZE / 2, "#f89", 3);
        DrawManager.drawLine(x + TILE_SIZE / 2, y - TILE_SIZE / 2, x - TILE_SIZE / 2, y + TILE_SIZE / 2, "#f89", 3);
      }

      if (settings.debugDrawWireframe) {
        const color = "#ff8fba";
        const wfX = this._getCollisionPoints()[0].x;
        const wfY = this._getCollisionPoints()[0].y;
        const wfW = this._getCollisionPoints()[2].x - wfX;
        const wfH = this._getCollisionPoints()[2].y - wfY;

        DrawManager.drawRectOutline(wfX, wfY, wfW, wfH, color, 1);
      }
    },

    updateBefore: (_deltaTime) => {
      const state = this._getState();
      const { EntityManager } = _game.MANAGERS;

      if (this._getIsDead()) this._setState(ZombieState.DEAD);

      switch (state) {
        case ZombieState.IDLE:
          this._animations?.setActiveAnimations(["idle"]);
          if (this._timers.movementRestart.getIsDone() && !this.getIsNextToPlayer()) {
            this._setState(ZombieState.CHASING);
          }
          break;

        case ZombieState.CHASING:
          this.gatherMovementData();
          this._animations?.setActiveAnimations(["run"]);
          break;
        case ZombieState.RETREATING:
          this.gatherMovementData();
          this._animations?.setActiveAnimations(["run"]);
          break;

        case ZombieState.ATTACKING:
          // this._animations?.setActiveAnimations(["death"]); // TODO: add correct animation
          if (this._timers.attack.getIsDone()) this._setState(ZombieState.CHASING);
          break;

        case ZombieState.KNOCKED:
          this._animations?.setActiveAnimations(["knocked"]);
          if (this._timers.hitState.getIsDone()) this._setState(ZombieState.IDLE);
          break;
        case ZombieState.HIT:
          this._animations?.setActiveAnimations(["hit"]);
          if (this._timers.hitState.getIsDone()) this._setState(ZombieState.IDLE);
          break;

        case ZombieState.DEAD:
          this._animations?.setActiveAnimations(["death"]);
          if (!this._timers.deathAnimation.getIsActive()) this._timers.deathAnimation.reset();
          if (this._timers.deathAnimation.getIsDone()) EntityManager.destroyEntity(this._entityId);
          break;

        default:
          assertNever(state);
      }
    },

    updateAfter: (_deltaTime) => {
      const { LevelManager, SettingsManager } = _game.MANAGERS;
      const settings = SettingsManager.getSettings().zombie;

      if (settings.isHurtBySunlight && isInsideGrid(this._getGridPosition()) && LevelManager.getIsDay())
        this._handleDamage(_deltaTime * settings.sunlightDamageIntensity);

      this.applyMovement(_deltaTime);
    },

    onDamage: (amount) => {
      const { SettingsManager } = _game.MANAGERS;
      const settings = SettingsManager.getSettings().zombie;

      if (this._getHealth() - amount < this._getMaxHealth() * 0.25) {
        this._setState(ZombieState.KNOCKED);
        this._timers.hitState.reset(settings.knockedStateDurationSec);
      } else {
        this._setState(ZombieState.HIT);
        this._timers.hitState.reset(settings.hitStateDurationSec);
      }

      this._timers.movementRestart.reset(settings.movementRestartSec);
    },

    onDeath: () => {
      const { LevelManager, AssetManager, VFXManager, SettingsManager } = _game.MANAGERS;
      const settings = SettingsManager.getSettings().zombie;
      const { TILE_SIZE } = GRID_CONFIG;
      const { x, y } = this._getWorldPosition();

      this._setState(ZombieState.DEAD);

      setTimeout(() => AssetManager.playAudioAsset("AZombieDeath", "sound", 0.7), Math.random() * 20);
      setTimeout(() => AssetManager.playAudioAsset("AZombieSquish", "sound", 0.5), Math.random() * 20);

      VFXManager.drawBloodPool({
        x: x - TILE_SIZE / 2 + (-0.5 + Math.random()) * 4,
        y: y - TILE_SIZE / 2 + (-0.5 + Math.random()) * 4,
      });

      if (settings.dropsItems) LevelManager.spawnCoin({ x: x / TILE_SIZE - 0.5, y: y / TILE_SIZE - 0.5 });
    },
  };

  public startWaiting(): void {
    this._setState(ZombieState.IDLE);
    this._instance.desiredVelocity = 0;
  }

  public startChasingPlayer(): void {
    this._setState(ZombieState.CHASING);
    this._instance.desiredVelocity = this._instance.maxSpeed;
  }

  public startRetreating(): void {
    return;
    this._setState(ZombieState.RETREATING);
    this._instance.desiredVelocity = this._instance.maxSpeed * 3.25;
  }

  // TODO: Unused
  public startAttacking(): void {
    const { AssetManager, SettingsManager } = _game.MANAGERS;
    const { attackDurationSec } = SettingsManager.getSettings().zombie;

    if (!this._timers.attackCooldown.getIsDone()) return;
    this._setState(ZombieState.ATTACKING);
    this._timers.attack.reset(attackDurationSec);
    this._instance.hasDealtDamage = false;

    AssetManager.playAudioAsset("AZombieAttack", "sound", 0.85);
  }

  private getNeighborData(flowFieldVector: Vector): { separation: Vector; density: number } {
    const { LevelManager } = _game.MANAGERS;
    const enemyGrid = LevelManager.getEnemyGrid();
    const { x: gx, y: gy } = this._getGridPosition();
    const selfWorldPos = this._getWorldPosition();
    const radius = GRID_CONFIG.TILE_SIZE * 2;

    const separation = { x: 0, y: 0 };
    let aheadCount = 0;

    if (!enemyGrid) return { separation, density: 0 };

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        enemyGrid[gx + dx]?.[gy + dy]?.forEach((zombie) => {
          if (this === zombie) return;

          const worldPos = zombie._getWorldPosition();
          const dist = Math.hypot(selfWorldPos.x - worldPos.x, selfWorldPos.y - worldPos.y);

          if (dist === 0) {
            // Deterministic push based on ID difference — always consistent direction
            const idDiff = this._entityId - zombie._getEntityId();
            separation.x += idDiff > 0 ? 0.1 : -0.1;
            separation.y += idDiff > 0 ? 0.1 : -0.1;
            return;
          }

          if (dist >= radius) return;

          // separation — all neighbors
          const strength = (radius - dist) / radius;
          separation.x += ((selfWorldPos.x - worldPos.x) / dist) * strength;
          separation.y += ((selfWorldPos.y - worldPos.y) / dist) * strength;

          // density — only ahead
          const toNeighbor = {
            x: (worldPos.x - selfWorldPos.x) / dist,
            y: (worldPos.y - selfWorldPos.y) / dist,
          };
          if (toNeighbor.x * flowFieldVector.x + toNeighbor.y * flowFieldVector.y > 0) aheadCount++;
        });
      }
    }

    return { separation, density: Math.min(aheadCount / 5, 1) };
  }

  private gatherMovementData(): void {
    if (this._getState() !== ZombieState.CHASING && this._getState() !== ZombieState.RETREATING) return;

    const { LevelManager } = _game.MANAGERS;
    const { flowField } = LevelManager;
    const { x: gx, y: gy } = this._getGridPosition();

    const flowFieldVector = flowField?.[gx]?.[gy]?.normalizedVector ?? { x: 0, y: 0 };
    const { separation, density } = this.getNeighborData(flowFieldVector);

    this._instance.movementFlowFieldVector = flowFieldVector;
    this._instance.movementSeparationVector = separation;
    this._instance.movementGridDensity = density;
  }

  private applyMovement(_deltaTime: number): void {
    if (this._getState() !== ZombieState.CHASING && this._getState() !== ZombieState.RETREATING) return;

    const { LevelManager, SettingsManager } = _game.MANAGERS;
    const { levelGrid } = LevelManager;
    const { x, y } = this._getWorldPosition();
    const settings = SettingsManager.getSettings().zombie;
    const {
      movementFlowFieldVector,
      movementSeparationVector,
      movementGridDensity,
      desiredVelocity,
      movementVelocity,
      movementDirection,
    } = this._instance;

    const combined = {
      x: movementFlowFieldVector.x + movementSeparationVector.x * settings.movementSeparationWeight,
      y: movementFlowFieldVector.y + movementSeparationVector.y * settings.movementSeparationWeight,
    };
    const mag = Math.hypot(combined.x, combined.y);
    const normalizedVector = mag > 0 ? { x: combined.x / mag, y: combined.y / mag } : { x: 0, y: 0 };

    const targetSpeed = desiredVelocity * lerp(1, 1 - settings.movementDensityWeight, movementGridDensity);
    this._instance.movementVelocity = lerp(movementVelocity, targetSpeed, _deltaTime * 3);

    const targetDirection = Math.atan2(normalizedVector.y, normalizedVector.x);
    this._instance.movementDirection = lerpAngle(movementDirection, targetDirection, _deltaTime * 4);

    if (this.getIsNextToPlayer()) {
      this._setState(ZombieState.IDLE);
      this._timers.movementRestart.reset(settings.movementRestartSec);
      return;
    }

    const futurePos: WorldPosition = {
      x: x + Math.cos(this._instance.movementDirection) * this._instance.movementVelocity * _deltaTime,
      y: y + Math.sin(this._instance.movementDirection) * this._instance.movementVelocity * _deltaTime,
    };

    // Wall collision with sliding
    const futureGridPos = worldToGrid(futurePos);
    if (
      !areVectorsEqual(futureGridPos, this._getGridPosition()) &&
      levelGrid?.[futureGridPos.x]?.[futureGridPos.y] === GridTileState.BLOCKED
    ) {
      const slideX = worldToGrid({ x: futurePos.x, y });
      const slideY = worldToGrid({ x, y: futurePos.y });
      const canSlideX = levelGrid?.[slideX.x]?.[slideX.y] !== GridTileState.BLOCKED;
      const canSlideY = levelGrid?.[slideY.x]?.[slideY.y] !== GridTileState.BLOCKED;

      if (canSlideX) {
        this.changeFacingPosition(futurePos.x < x);
        this._setWorldPosition({ x: futurePos.x, y });
      } else if (canSlideY) {
        this._setWorldPosition({ x, y: futurePos.y });
      } else {
        this._setState(ZombieState.IDLE);
        this._timers.movementRestart.reset(settings.movementRestartSec);
      }
      return;
    }

    // Zombie-zombie collision with sliding if current weight > 10
    //   if (
    //     this.hasCollisionAhead(futurePos) &&
    //     (LevelManager.flowField?.[futureGridPos.x]?.[futureGridPos.y]?.distanceWeight ?? 0) < 4
    //   ) {
    //     const slideX: WorldPosition = { x: futurePos.x, y };
    //     const slideY: WorldPosition = { x, y: futurePos.y };
    //
    // if (!this.hasCollisionAhead(slideX)) {
    //   this.changeFacingPosition(futurePos.x < x);
    //   this._setWorldPosition(slideX);
    // } else if (!this.hasCollisionAhead(slideY)) {
    //   this._setWorldPosition(slideY);
    // } else return;
    //   }
    //
    this.hasCollisionAhead({ x, y });
    this.changeFacingPosition(futurePos.x < x);
    this._setWorldPosition(futurePos);
  }

  private changeFacingPosition(isFacingLeft: boolean): void {
    if (this._timers.facingDirection.getIsDone() || !this._timers.facingDirection.getIsActive()) {
      this._instance.isFacingLeft = isFacingLeft;
      this._timers.facingDirection.reset();
    }
  }

  private getIsNextToPlayer(): boolean {
    const { LevelManager } = _game.MANAGERS;
    const player = LevelManager.player;
    if (!player) return false;

    const { x: pgx, y: pgy } = player._getGridPosition();
    const { x: gx, y: gy } = this._getGridPosition();

    const isCloseToPlayer = pgx >= gx - 1 && pgx <= gx + 1 && pgy >= gy - 1 && pgy <= gy + 1;
    return isCloseToPlayer;
  }

  private hasCollisionAhead(futurePos: WorldPosition): boolean {
    const { LevelManager } = _game.MANAGERS;
    const enemyGrid = LevelManager.getEnemyGrid();
    const { x: gx, y: gy } = this._getGridPosition();
    const selfPos = this._getWorldPosition();
    const { movementFlowFieldVector } = this._instance;

    if (!enemyGrid) return false;
    const corners = this._getCollisionPoints(futurePos);

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const cell = enemyGrid[gx + dx]?.[gy + dy];
        if (!cell) continue;

        for (const neighbor of cell) {
          if (neighbor === this) continue;

          const neighborPos = neighbor._getWorldPosition();
          const dist = Math.hypot(selfPos.x - neighborPos.x, selfPos.y - neighborPos.y);
          if (dist === 0) continue;

          // Only block against zombies ahead in flow field direction
          const toNeighbor = {
            x: (neighborPos.x - selfPos.x) / dist,
            y: (neighborPos.y - selfPos.y) / dist,
          };
          const isAhead = toNeighbor.x * movementFlowFieldVector.x + toNeighbor.y * movementFlowFieldVector.y > 0;
          if (!isAhead) continue;

          const neighborHalf = (neighbor._getSize() * 0.75) / 2;
          for (const corner of corners) {
            if (
              corner.x >= neighborPos.x - neighborHalf &&
              corner.x <= neighborPos.x + neighborHalf &&
              corner.y >= neighborPos.y - neighborHalf &&
              corner.y <= neighborPos.y + neighborHalf
            ) {
              return true;
            }
          }
        }
      }
    }

    return false;
  }
}
