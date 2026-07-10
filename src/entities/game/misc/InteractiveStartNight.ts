import { GRID_CONFIG } from "../../../config/core/grid.config";
import type GameInstance from "../../../GameInstance";
import { ZIndex } from "../../../types/lib/ZIndex";
import AEntity, { type AEntityEngineBody, type EntityConstructorProps } from "../../engine/AEntity";
import type { EntityAnimationsSpecs } from "../../engine/systems/EntityAnimation";
import { EntityCollisionShape } from "../../engine/systems/EntityCollisionPoints";
import Matter from "matter-js";

/** `this.gameInstance` */ let _game: GameInstance;

export default class InteractiveStartNight extends AEntity {
  constructor({ gameInstance, entityId, worldPos }: EntityConstructorProps) {
    _game = gameInstance;
    const { AssetManager, EntityManager } = _game.MANAGERS;
    const size = GRID_CONFIG.TILE_SIZE;

    const animations: EntityAnimationsSpecs = {
      frameWidth: 32,
      frameHeight: 32,
      fps: 4,
      animations: [
        {
          id: "main",
          loop: true,
          frameCount: 4,
          assetVariants: [AssetManager.getImageAsset("UIHighlightObjPositive")!],
        },
      ],
    };

    super({
      worldPos,
      entityId,
      size,
      animations,
      initialState: undefined,
      collisionPoints: EntityCollisionShape.GetRectangle({ x: -size / 2, y: -size / 2 }, { x: size / 2, y: size / 2 }),
    });

    this._animations?.setActiveAnimations(["main"]);

    Matter.Events.on(EntityManager._physicsEngine, "collisionStart", this._onCollisionStart);
    Matter.Events.on(EntityManager._physicsEngine, "collisionEnd", this._onCollisionEnd);
  }

  public _engine: AEntityEngineBody = {
    updateBefore: (_deltaTime) => {},

    draw: () => {
      const { DrawManager, LevelManager, BuildModeManager } = _game.MANAGERS;
      if (!LevelManager.getIsDay() || BuildModeManager.isBuildModeActive) return;

      this._animations?.drawActiveAnimations(this._getWorldPosition(), this._getSize() * 1.2, DrawManager, {
        zIndex: ZIndex.INTERACTIVE,
        alpha: 1,
      });
    },

    drawShadow: () => {},

    drawDebug: () => {},

    onDestroy: () => {
      const { EntityManager } = _game.MANAGERS;
      Matter.Events.off(EntityManager._physicsEngine, "collisionStart", this._onCollisionStart);
      Matter.Events.off(EntityManager._physicsEngine, "collisionEnd", this._onCollisionEnd);
      EntityManager.destroyEntity(this._entityId);
    },
  };

  private _onCollisionStart = (event: Matter.IEventCollision<Matter.Engine>) => {
    const { LevelManager, UIManager } = _game.MANAGERS;
    if (!LevelManager.getIsDay()) return;

    for (const pair of event.pairs) {
      const other =
        pair.bodyA === this._physicsBody ? pair.bodyB : pair.bodyB === this._physicsBody ? pair.bodyA : null;
      if (!other) continue;

      const entity = other.plugin?.entity;
      if (entity !== LevelManager.player) continue;

      UIManager.showSleepUI();
    }
  };

  private _onCollisionEnd = (event: Matter.IEventCollision<Matter.Engine>) => {
    const { LevelManager, UIManager } = _game.MANAGERS;

    for (const pair of event.pairs) {
      const other =
        pair.bodyA === this._physicsBody ? pair.bodyB : pair.bodyB === this._physicsBody ? pair.bodyA : null;
      if (!other) continue;

      const entity = other.plugin?.entity;
      if (entity !== LevelManager.player) continue;

      UIManager.hideSleepUI();
    }
  };
}
