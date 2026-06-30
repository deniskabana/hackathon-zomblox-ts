import Matter from "matter-js";
import { GRID_CONFIG } from "../../../config/core/grid.config";
import type GameInstance from "../../../GameInstance";
import { EntityType } from "../../../types/engine/EntityType";
import { ZIndex } from "../../../types/lib/ZIndex";
import SpriteSheet from "../../../utils/classes/SpriteSheet";
import AEntity, { type AEntityEngineBody, type EntityConstructorProps } from "../../engine/AEntity";
import { EntityCollisionShape } from "../../engine/systems/EntityCollisionPoints";
import InteractiveIndicator from "../misc/InteractiveIndicator";
import { DEF_WEAPONS } from "../../../config/game/weapons.config";

/** `this.gameInstance` */ let _game: GameInstance;

export default class ActionShopShotgun extends AEntity {
  private _indicatorEntity: InteractiveIndicator;
  private PRICE = DEF_WEAPONS.Shotgun.cost;

  constructor({ gameInstance, entityId, worldPos }: EntityConstructorProps) {
    _game = gameInstance;
    const { EntityManager } = _game.MANAGERS;
    const size = GRID_CONFIG.TILE_SIZE;

    super({
      worldPos,
      entityId,
      size,
      initialState: undefined,
      collisionPoints: EntityCollisionShape.GetRectangle({ x: -size / 2, y: -size / 2 }, { x: size / 2, y: size / 2 }),
    });

    this._indicatorEntity = EntityManager.createEntity(
      EntityType.SENSOR,
      (entityId) => new InteractiveIndicator({ gameInstance, entityId, worldPos }),
    );
    this._indicatorEntity.setPrice(this.PRICE);

    Matter.Events.on(EntityManager._physicsEngine, "collisionStart", this._onCollisionStart);
    Matter.Events.on(EntityManager._physicsEngine, "collisionEnd", this._onCollisionEnd);
  }

  public _engine: AEntityEngineBody = {
    draw: () => {
      const { DrawManager, AssetManager } = _game.MANAGERS;
      const size = this._getSize();
      const { x, y } = this._getWorldPosition();

      const gunSize = size * 1.25;
      DrawManager.queueDrawSprite(
        x - gunSize / 2,
        y - gunSize / 2,
        SpriteSheet.fromGrid(AssetManager.getImageAsset("SPlayerWeapons")!, 32, 32, 12),
        3,
        gunSize,
        gunSize,
        ZIndex.INDICATORS,
      );
    },

    drawDebug: () => {},

    updateAfter: () => {},

    onDestroy: () => {
      const { EntityManager } = _game.MANAGERS;
      Matter.Events.off(EntityManager._physicsEngine, "collisionStart", this._onCollisionStart);
      Matter.Events.off(EntityManager._physicsEngine, "collisionEnd", this._onCollisionEnd);
      EntityManager.destroyEntity(this._entityId);
    },
  };

  private _onCollisionStart = (event: Matter.IEventCollision<Matter.Engine>) => {
    const { LevelManager } = _game.MANAGERS;

    for (const pair of event.pairs) {
      const other =
        pair.bodyA === this._physicsBody ? pair.bodyB : pair.bodyB === this._physicsBody ? pair.bodyA : null;
      if (!other) continue;

      const entity = other.plugin?.entity;
      if (entity !== LevelManager.player) continue;

      const currency = LevelManager.getCurrency();
      if (currency < this.PRICE) this._indicatorEntity.setNegative();
      else this._indicatorEntity.setPositive();
    }
  };
  private _onCollisionEnd = (event: Matter.IEventCollision<Matter.Engine>) => {
    const { LevelManager } = _game.MANAGERS;

    for (const pair of event.pairs) {
      const other =
        pair.bodyA === this._physicsBody ? pair.bodyB : pair.bodyB === this._physicsBody ? pair.bodyA : null;
      if (!other) continue;

      const entity = other.plugin?.entity;
      if (entity !== LevelManager.player) continue;

      this._indicatorEntity.setNeutral();
    }
  };
}
