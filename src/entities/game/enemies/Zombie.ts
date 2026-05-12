import { GRID_CONFIG, gridToWorld, type WorldPosition } from "../../../config/core/grid.config";
import type GameInstance from "../../../GameInstance";
import type { Vector } from "../../../types/Vector";
import { ZIndex } from "../../../types/ZIndex";
import assertNever from "../../../utils/assertNever";
import isInsideGrid from "../../../utils/grid/isInsideGrid";
import lerp from "../../../utils/math/lerp";
import { lerpAngle } from "../../../utils/math/radialLerp";
import AEntity, { type AEntityEngine, type EntityConstructorProps } from "../../engine/AEntity";
import type { EntityAnimationsSpecs } from "../../engine/systems/EntityAnimation";
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
  attack: EntityTimer<"???">;
  deathAnimation: EntityTimer<"Lets zombie finish death animation before destruction">; // TODO: Add onAnimationFinish or something similar to EntityAnimation
  movementRestart: EntityTimer<"Throttle restarting movement after stopping">;
  facingDirection: EntityTimer<"Throttle facing direction changes">;
}

interface Instance {
  hasDealtDamage: boolean;
  isFacingLeft: boolean;
  distanceFromPlayer: number;

  desiredVelocity: number;
  movementVector: Vector | undefined;
  movementDirection: number;
  movementVelocity: number;

  movementSeparationVector: Vector;
  movementGridDensity: number;
  movementFlowFieldVector: Vector;
}

interface Settings {
  attackDuration: number;
  maxSpeed: number;
  minDistanceFromPlayer: number;
  moveSeparationWeight: number;
  moveDensityWeight: number;
}

export default class Zombie extends AEntity<ZombieState, Instance, Timers, Settings> {
  constructor({ gameInstance, entityId, gridPos }: EntityConstructorProps) {
    _game = gameInstance;
    const { AssetManager, GameManager, LevelManager } = _game.MANAGERS;
    const { maxSpeed, maxHealth, attackDuration, minDistanceFromPlayer, attackCooldownSec } =
      GameManager.getSettings().rules.zombie;
    const size: number = GRID_CONFIG.TILE_SIZE * 1.5;

    const timers: Timers = {
      attack: new EntityTimer({ initialValue: attackDuration, autoStart: false }),
      attackCooldown: new EntityTimer({ initialValue: attackCooldownSec, autoStart: false }),
      deathAnimation: new EntityTimer({ initialValue: 1, autoStart: false }),
      movementRestart: new EntityTimer({ initialValue: 0.5, autoStart: false }),
      facingDirection: new EntityTimer({ initialValue: 0.2, autoStart: false }),
    };

    const animations: EntityAnimationsSpecs = {
      frameWidth: 32,
      frameHeight: 32,
      activeVariant: Math.floor(Math.random() * 4),
      fps: 9,
      animations: [
        {
          id: "idle",
          frameCount: 6,
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
          frameCount: 8,
          assetVariants: [
            AssetManager.getImageAsset("SZombie1Death")!,
            AssetManager.getImageAsset("SZombie2Death")!,
            AssetManager.getImageAsset("SZombie3Death")!,
            AssetManager.getImageAsset("SZombie4Death")!,
          ],
        },
      ],
    };

    const instance: Instance = {
      movementVector: undefined,
      movementDirection: 0,
      movementVelocity: 0,
      desiredVelocity: maxSpeed,
      movementFlowFieldVector: { x: 0, y: 0 },
      movementGridDensity: 0,
      movementSeparationVector: { x: 0, y: 0 },
      hasDealtDamage: false,
      isFacingLeft: false,
      distanceFromPlayer: Infinity,
    };

    const settings: Settings = {
      attackDuration,
      minDistanceFromPlayer,
      maxSpeed: maxSpeed,
      moveSeparationWeight: 0.55,
      moveDensityWeight: 0.9,
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
      settings,
    });

    // Starting behavior based on gameplay loop - day / night
    if (LevelManager.getIsDay()) this.startRetreating();
    else this.startChasingPlayer();
  }

  public _engine: AEntityEngine = {
    draw: () => {
      const { DrawManager } = _game.MANAGERS;
      const size = this._getSize();
      this._animations?.drawActiveAnimations(this._getWorldPosition(), size, DrawManager, {
        scaleX: this._instance.isFacingLeft ? 1 : -1,
      });
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
          x + (Math.cos(this._instance.movementDirection) * TILE_SIZE) / 2 + 2,
          y + (Math.sin(this._instance.movementDirection) * TILE_SIZE) / 2 + 2,
          "#000",
          2,
        );
        DrawManager.drawArrow(
          x,
          y,
          x + (Math.cos(this._instance.movementDirection) * TILE_SIZE) / 2,
          y + (Math.sin(this._instance.movementDirection) * TILE_SIZE) / 2,
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

    updateBefore: (_deltaTime) => {
      const state = this._getState();
      const { EntityManager } = _game.MANAGERS;

      switch (state) {
        case ZombieState.IDLE:
          this._animations?.setActiveAnimations(["idle"]);
          if (this._timers.movementRestart.getIsDone() && !this.getIsCloseToPlayer()) {
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
          break;

        case ZombieState.HIT:
          this._animations?.setActiveAnimations(["hit"]);
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
      const { LevelManager } = _game.MANAGERS;

      // Damage in sunlight
      if (isInsideGrid(this._getGridPosition()) && LevelManager.getIsDay()) this._handleDamage(_deltaTime * 10);

      this.applyMovement(_deltaTime);
    },

    onDeath: () => {
      const { LevelManager, AssetManager, VFXManager } = _game.MANAGERS;
      const { TILE_SIZE } = GRID_CONFIG;
      const { x, y } = this._getWorldPosition();

      this._setState(ZombieState.DEAD);
      LevelManager.spawnCoin({ x: x / TILE_SIZE - 0.5, y: y / TILE_SIZE - 0.5 });
      AssetManager.playAudioAsset("AZombieDeath", "sound");
      VFXManager.drawBloodPool({
        x: x - TILE_SIZE / 2 + (-0.5 + Math.random()) * 4,
        y: y - TILE_SIZE / 2 + (-0.5 + Math.random()) * 4,
      });
    },
  };

  public startWaiting(): void {
    this._setState(ZombieState.IDLE);
    this._instance.desiredVelocity = 0;
  }

  public startChasingPlayer(): void {
    this._setState(ZombieState.CHASING);
    this._instance.desiredVelocity = this._settings.maxSpeed;
  }

  public startRetreating(): void {
    this._setState(ZombieState.RETREATING);
    this._instance.desiredVelocity = this._settings.maxSpeed * 3.25;
  }

  public startAttacking(): void {
    const { AssetManager } = _game.MANAGERS;

    if (!this._timers.attackCooldown.getIsDone()) return;
    this._setState(ZombieState.ATTACKING);
    this._timers.attack.reset();
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
          if (dist === 0 || dist >= radius) return;

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

    const { x, y } = this._getWorldPosition();
    const { moveSeparationWeight, moveDensityWeight } = this._settings;
    const {
      movementFlowFieldVector,
      movementSeparationVector,
      movementGridDensity,
      desiredVelocity,
      movementVelocity,
      movementDirection,
    } = this._instance;

    const combined = {
      x: lerp(movementFlowFieldVector.x, movementSeparationVector.x, moveSeparationWeight),
      y: lerp(movementFlowFieldVector.y, movementSeparationVector.y, moveSeparationWeight),
    };
    const mag = Math.hypot(combined.x, combined.y);
    const normalizedVector = mag > 0 ? { x: combined.x / mag, y: combined.y / mag } : { x: 0, y: 0 };

    const targetSpeed = desiredVelocity * lerp(1, 1 - moveDensityWeight, movementGridDensity);
    this._instance.movementVelocity = lerp(movementVelocity, targetSpeed, _deltaTime * 4);

    const targetDirection = Math.atan2(normalizedVector.y, normalizedVector.x);
    this._instance.movementDirection = lerpAngle(movementDirection, targetDirection, _deltaTime * 7);

    if (this.getIsCloseToPlayer()) {
      this._setState(ZombieState.IDLE);
      this._timers.movementRestart.reset();
      return;
    }

    const futurePos: WorldPosition = {
      x: x + Math.cos(this._instance.movementDirection) * this._instance.movementVelocity * _deltaTime,
      y: y + Math.sin(this._instance.movementDirection) * this._instance.movementVelocity * _deltaTime,
    };

    // NAIVE COLLISION SYSTEM
    // const futureGridPos = worldToGrid(futurePos);
    // const enemyGrid = LevelManager.getEnemyGrid();
    // if (
    //   !areVectorsEqual(futureGridPos, this._getGridPosition()) &&
    //   ((levelGrid?.[futureGridPos.x]?.[futureGridPos.y]?.state === GridTileState.BLOCKED ||
    //     enemyGrid?.[futureGridPos.x]?.[futureGridPos.y]?.length) ??
    //     0 > 2)
    // ) {
    //   this._setState(ZombieState.IDLE);
    //   this._timers.movementRestart = -0.5;
    //   return;
    // }

    this.changeFacingPosition(futurePos.x < x);
    this._setWorldPosition(futurePos);
  }

  private changeFacingPosition(isFacingLeft: boolean): void {
    if (this._timers.facingDirection.getIsDone()) {
      this._instance.isFacingLeft = isFacingLeft;
      this._timers.facingDirection.reset();
    }
  }

  private getIsCloseToPlayer(): boolean {
    const { LevelManager } = _game.MANAGERS;
    const player = LevelManager.player;
    if (!player) return false;

    const { x: pgx, y: pgy } = player._getGridPosition();
    const { x: gx, y: gy } = this._getGridPosition();

    const isCloseToPlayer = pgx >= gx - 1 && pgx <= gx + 1 && pgy >= gy - 1 && pgy <= gy + 1;
    return isCloseToPlayer;
  }
}
