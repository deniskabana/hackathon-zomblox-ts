import Matter from "matter-js";
import { GRID_CONFIG } from "../../../config/core/grid.config";
import type GameInstance from "../../../GameInstance";
import { ZIndex } from "../../../types/lib/ZIndex";
import AEntity, { type AEntityEngineBody, type EntityConstructorProps } from "../../engine/AEntity";
import type { EntityAnimationsSpecs } from "../../engine/systems/EntityAnimation";
import { EntityCollisionShape } from "../../engine/systems/EntityCollisionPoints";
import { EntityTimer } from "../../engine/systems/EntityTimer";

/** `this.gameInstance` */ let _game: GameInstance;

interface Timers {
  lifetime: EntityTimer<"Destroy sensor automatically">;
  hotDelay: EntityTimer<"The delay when the attack enables it's colliders.">;
}

export default class SensorAttackSlash extends AEntity<undefined, undefined, Timers> {
  private angle: number = 0;
  private isHot: boolean = false;

  constructor({ gameInstance, entityId, worldPos }: EntityConstructorProps) {
    _game = gameInstance;
    const { AssetManager, SettingsManager, EntityManager } = _game.MANAGERS;

    const { attackDurationSec } = SettingsManager.getSettings().zombie;

    const animations: EntityAnimationsSpecs = {
      frameWidth: 40,
      frameHeight: 40,
      fps: 8,
      animations: [
        {
          id: "idle",
          loop: false,
          frameCount: 6,
          assetVariants: [AssetManager.getImageAsset("IFXAttackSlash")!],
        },
      ],
    };

    super({
      worldPos,
      entityId,
      size: GRID_CONFIG.TILE_SIZE,
      initialState: undefined,
      collisionPoints: EntityCollisionShape.GetRectangle(
        { x: -GRID_CONFIG.TILE_SIZE / 2, y: -GRID_CONFIG.TILE_SIZE / 2 },
        { x: GRID_CONFIG.TILE_SIZE / 2, y: GRID_CONFIG.TILE_SIZE / 2 },
      ),
      animations,
      timers: {
        lifetime: new EntityTimer({ initialValue: attackDurationSec, autoStart: true }),
        hotDelay: new EntityTimer({ initialValue: attackDurationSec / 2, autoStart: true }),
      },
    });

    this._animations?.setActiveAnimations(["idle"]);

    Matter.Events.on(EntityManager._physicsEngine, "collisionActive", this._onCollision);
  }

  public _engine: AEntityEngineBody = {
    draw: () => {
      const { DrawManager } = _game.MANAGERS;
      const size = this._getSize();
      this._animations?.drawActiveAnimations(this._getWorldPosition(), size, DrawManager, {
        rotation: this.angle,
        zIndex: ZIndex.EFFECTS,
      });
    },

    drawDebug: () => {},

    updateAfter: () => {
      if (this._timers.hotDelay.getIsDone()) {
        this.isHot = true;
        this._timers.hotDelay.reset();
        this._timers.hotDelay.pause();
      }
      if (this._timers.lifetime.getIsDone()) this._destructor();
    },

    onDestroy: () => {
      const { EntityManager } = _game.MANAGERS;

      Matter.Events.off(EntityManager._physicsEngine, "collisionActive", this._onCollision);
      EntityManager.destroyEntity(this._entityId);
    },
  };

  private _onCollision = (event: Matter.IEventCollision<Matter.Engine>) => {
    const { LevelManager } = _game.MANAGERS;

    if (!this.isHot) return;

    for (const pair of event.pairs) {
      const other =
        pair.bodyA === this._physicsBody ? pair.bodyB : pair.bodyB === this._physicsBody ? pair.bodyA : null;
      if (!other) continue;

      const entity = other.plugin?.entity;
      if (entity === LevelManager.player) this._damagePlayer();
    }
  };

  private _damagePlayer() {
    const { LevelManager } = _game.MANAGERS;

    this.isHot = false;
    LevelManager.player?._handleDamage(6);
  }

  public setAngle(angle: number) {
    this.angle = angle;
  }

  public getIsHot() {
    return this.isHot;
  }
}
