import Matter from "matter-js";
import { GRID_CONFIG, type WorldPosition } from "../../../config/core/grid.config";
import type GameInstance from "../../../GameInstance";
import type { Vector } from "../../../types/lib/Vector";
import { ZIndex } from "../../../types/lib/ZIndex";
import assertNever from "../../../utils/assertNever";
import lerp from "../../../utils/math/lerp";
import { lerpAngle } from "../../../utils/math/radialLerp";
import AEntity, { type AEntityEngineBody, type EntityConstructorProps } from "../../engine/AEntity";
import type { EntityAnimationsSpecs } from "../../engine/systems/EntityAnimation";
import { EntityCollisionShape } from "../../engine/systems/EntityCollisionPoints";
import { EntityTimer } from "../../engine/systems/EntityTimer";
import { EntityType } from "../../../types/engine/EntityType";
import SensorAttackSlash from "../sensors/SensorAttackSlash";
import radiansToVector from "../../../utils/math/radiansToVector";
import getDirectionalAngle from "../../../utils/math/getDirectionalAngle";
import type { FlowField } from "../../../utils/grid/generateFlowFieldMap";

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

  maxSpeed: number;
  desiredVelocity: number;
  speedCoeficient: number;
  movementDirection: number;
  movementVelocity: number;

  movementSeparationVector: Vector;
  movementGridDensity: number;
  movementFlowFieldVector: Vector;
}

export default class Zombie extends AEntity<ZombieState, Instance, Timers> {
  constructor({ gameInstance, entityId, worldPos }: EntityConstructorProps) {
    _game = gameInstance;
    const { AssetManager, SettingsManager, LevelManager } = _game.MANAGERS;
    const { TILE_SIZE } = GRID_CONFIG;
    const settings = SettingsManager.getSettings().zombie;

    const timers: Timers = {
      attack: new EntityTimer({ initialValue: settings.attackDurationSec }),
      attackCooldown: new EntityTimer({ initialValue: settings.attackCooldownSec }),
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
      speedCoeficient: 1,
      movementDirection: 0,
      movementVelocity: 0,
      desiredVelocity: 0,
      movementFlowFieldVector: { x: 0, y: 0 },
      movementGridDensity: 0,
      movementSeparationVector: { x: 0, y: 0 },
      hasDealtDamage: false,
      isFacingLeft: false,
    };

    const colliderWidth = TILE_SIZE * 0.75;
    const colliderHeight = TILE_SIZE * 0.9;
    const colliderOffsetY = 0;

    super({
      worldPos,
      size: settings.worldSize,
      entityId,
      animations,
      collisionPoints: EntityCollisionShape.GetRectangle(
        { x: -colliderWidth / 2, y: -colliderHeight / 2 + colliderOffsetY },
        { x: colliderWidth / 2, y: colliderHeight / 2 + colliderOffsetY },
      ),
      hitboxesPoints: [
        // Head
        EntityCollisionShape.GetRectangle(
          { x: -TILE_SIZE / 2, y: -TILE_SIZE - 6 },
          { x: TILE_SIZE / 2, y: -TILE_SIZE / 4 - 2 },
        ),
        // Body
        EntityCollisionShape.GetRectangle(
          { x: -TILE_SIZE / 3 + 2, y: -TILE_SIZE / 4 - 2 },
          { x: TILE_SIZE / 3 - 2, y: TILE_SIZE / 4 - 2 },
        ),
      ],
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
      const { DrawManager, SettingsManager } = _game.MANAGERS;
      const debugFlowField = SettingsManager.getSettings().rules.debugDrawFlowFieldGrid;
      const size = this._getSize();

      this._animations?.drawActiveAnimations(this._getWorldPosition(), size, DrawManager, {
        scaleX: this._instance.isFacingLeft ? 1 : -1,
        offset: { x: 0, y: -this._getSize() * 0.35 },
        alpha: debugFlowField ? 0.4 : 1,
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

      if (settings.debugDrawHitboxes) {
        for (const hitbox of this._hitboxesPoints) {
          const color = "#4fafaa";
          const wfX = x + hitbox[0].x;
          const wfY = y + hitbox[1].y;
          const wfW = hitbox[1].x - hitbox[0].x;
          const wfH = hitbox[2].y - hitbox[1].y;

          DrawManager.drawRectOutline(wfX, wfY, wfW, wfH, color, 1);
        }
      }
    },

    updateBefore: (_deltaTime) => {
      const { LevelManager } = _game.MANAGERS;
      const state = this._getState();

      if (LevelManager.getIsDay()) this._setState(ZombieState.RETREATING);
      if (this._getIsDead()) this._setState(ZombieState.DEAD);

      switch (state) {
        case ZombieState.IDLE:
          this._animations?.setActiveAnimations(["idle"]);
          if (this._timers.movementRestart.getIsDone() && !this.getIsNextToPlayer()) {
            this._setState(ZombieState.CHASING);
          }
          if (this.getIsNextToPlayer()) this.startAttacking();
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
          this._animations?.setActiveAnimations(["idle"]);
          if (this._timers.attack.getIsDone()) {
            this._setState(ZombieState.IDLE);
            this._timers.attackCooldown.reset();
          }
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
          if (this._timers.deathAnimation.getIsDone()) this._destructor();
          break;

        default:
          assertNever(state);
      }
    },

    updateAfter: (_deltaTime) => {
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
      return true;
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

      if (settings.dropsItems) LevelManager.spawnCoin({ x, y });
      if (LevelManager.levelState) LevelManager.levelState.zombiesKillCounter += 1;
    },

    onDestroy: () => {
      const { EntityManager, LevelManager } = _game.MANAGERS;
      if (LevelManager.levelState) LevelManager.levelState.zombiesKillCounter++;
      EntityManager.destroyEntity(this._entityId);
    },
  };

  public startWaiting(): void {
    this._setState(ZombieState.IDLE);
    this._instance.desiredVelocity = 0;
  }

  public startChasingPlayer(): void {
    this._setState(ZombieState.CHASING);
    this._instance.speedCoeficient = 1;
    this._instance.desiredVelocity = this._instance.maxSpeed;
  }

  public startRetreating(): void {
    this._setState(ZombieState.RETREATING);
    this._instance.speedCoeficient = 2.5;
  }

  private startAttacking(): void {
    const { AssetManager, SettingsManager, EntityManager, LevelManager } = _game.MANAGERS;
    const { attackDurationSec } = SettingsManager.getSettings().zombie;

    if (!this._timers.attackCooldown.getIsDone()) return;
    if (!this._timers.attack.getIsActive()) return;

    const direction = getDirectionalAngle(
      LevelManager.player?._getWorldPosition() ?? { x: 0, y: 0 },
      this._getWorldPosition(),
    );
    const { x, y } = this._getWorldPosition();
    const dirPos = radiansToVector(direction);
    const sensorPos: WorldPosition = {
      x: x + dirPos.x * (this._getSize() / 3),
      y: y + dirPos.y * (this._getSize() / 4) - 12,
    };
    const entity = EntityManager.createEntity(
      EntityType.SENSOR,
      (entityId) => new SensorAttackSlash({ worldPos: sensorPos, entityId, gameInstance: _game }),
    );
    entity.setAngle(direction);

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

          // Separation — all neighbors
          const strength = (radius - dist) / radius;
          separation.x += ((selfWorldPos.x - worldPos.x) / dist) * strength;
          separation.y += ((selfWorldPos.y - worldPos.y) / dist) * strength;

          // Density — only ahead
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

    let flowField: FlowField | undefined = undefined;
    if (this._getState() === ZombieState.CHASING) flowField = LevelManager.flowField;
    if (this._getState() === ZombieState.RETREATING) flowField = LevelManager.retreatFlowField;
    if (!flowField) return;

    const vectors: Vector[] = [];
    const flowFieldVector: Vector = { x: 0, y: 0 };
    const { x: gx, y: gy } = this._getGridPosition();
    if (flowField?.[gx]?.[gy]?.normalizedVector) {
      vectors.push(flowFieldVector);
      flowFieldVector.x = flowField[gx][gy].normalizedVector.x;
      flowFieldVector.y = flowField[gx][gy].normalizedVector.y;
    }

    const { separation, density } = this.getNeighborData(flowFieldVector);

    this._instance.movementFlowFieldVector = flowFieldVector;
    this._instance.movementSeparationVector = separation;
    this._instance.movementGridDensity = density;
  }

  private applyMovement(_deltaTime: number): void {
    if (this._getState() !== ZombieState.CHASING && this._getState() !== ZombieState.RETREATING) return;

    const { SettingsManager, LevelManager } = _game.MANAGERS;
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

    const targetSpeed =
      desiredVelocity *
      this._instance.speedCoeficient *
      lerp(1, 1 - settings.movementDensityWeight, movementGridDensity);
    this._instance.movementVelocity = lerp(movementVelocity, targetSpeed, _deltaTime * 6);

    const targetDirection = Math.atan2(normalizedVector.y, normalizedVector.x);
    this._instance.movementDirection = lerpAngle(movementDirection, targetDirection, _deltaTime * 14);

    if (
      this.getIsNextToPlayer() &&
      (this._getState() === ZombieState.CHASING || this._getState() === ZombieState.IDLE) &&
      !LevelManager.getIsDay()
    ) {
      this.startAttacking();
      this._timers.movementRestart.reset(settings.movementRestartSec);
      return;
    }

    this.changeFacingPosition(combined.x < 0);

    if (!this._physicsBody) return;
    Matter.Body.setVelocity(this._physicsBody, normalizedVector);
    Matter.Body.setSpeed(this._physicsBody, this._instance.movementVelocity / 50);

    this._setState(ZombieState.CHASING);
  }

  private changeFacingPosition(isFacingLeft: boolean): void {
    if (this._timers.facingDirection.getIsDone() || !this._timers.facingDirection.getIsActive()) {
      this._instance.isFacingLeft = isFacingLeft;
      this._timers.facingDirection.reset();
    }
  }

  private getIsNextToPlayer(distance: number = 0.5): boolean {
    const { LevelManager } = _game.MANAGERS;
    const { TILE_SIZE } = GRID_CONFIG;
    const player = LevelManager.player;
    if (!player) return false;

    const playerAABB = player._getAABB();
    const zombieAABB = this._getAABB();

    const expanded = {
      left: zombieAABB.left - distance * TILE_SIZE,
      right: zombieAABB.right + distance * TILE_SIZE,
      top: zombieAABB.top - distance * TILE_SIZE,
      bottom: zombieAABB.bottom + distance * TILE_SIZE,
    };

    return (
      playerAABB.right >= expanded.left &&
      playerAABB.left <= expanded.right &&
      playerAABB.bottom >= expanded.top &&
      playerAABB.top <= expanded.bottom
    );
  }
}
