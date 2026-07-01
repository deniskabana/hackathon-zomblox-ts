import { GRID_CONFIG } from "../../../config/core/grid.config";
import type GameInstance from "../../../GameInstance";
import { ZIndex } from "../../../types/lib/ZIndex";
import SpriteSheet from "../../../utils/classes/SpriteSheet";
import lerp from "../../../utils/math/lerp";
import AEntity, { type AEntityEngineBody, type EntityConstructorProps } from "../../engine/AEntity";
import type { EntityAnimationsSpecs } from "../../engine/systems/EntityAnimation";
import { EntityCollisionShape } from "../../engine/systems/EntityCollisionPoints";
import { type ShopItem } from "../../../config/game/shop.config";
import Matter from "matter-js";

/** `this.gameInstance` */ let _game: GameInstance;

enum IndicatorState {
  NEUTRAL = "NEUTRAL",
  POSITIVE = "POSITIVE",
  NEGATIVE = "NEGATIVE",
}

interface Instance {
  price: number;
  coinSpritesheet: SpriteSheet;
  opacity: number;
  desiredOpacity: number;
}

export default class InteractiveShopEntity extends AEntity<IndicatorState, Instance> {
  private shopItem: ShopItem;
  private alpha: number = 1;

  constructor({ gameInstance, entityId, worldPos, shopItem }: EntityConstructorProps & { shopItem: ShopItem }) {
    _game = gameInstance;
    const { AssetManager, EntityManager } = _game.MANAGERS;
    const size = GRID_CONFIG.TILE_SIZE;

    const animations: EntityAnimationsSpecs = {
      frameWidth: 32,
      frameHeight: 32,
      fps: 4,
      animations: [
        {
          id: IndicatorState.NEUTRAL,
          loop: true,
          frameCount: 1,
          assetVariants: [AssetManager.getImageAsset("UIHighlightObj")!],
        },
        {
          id: IndicatorState.POSITIVE,
          loop: true,
          frameCount: 4,
          assetVariants: [AssetManager.getImageAsset("UIHighlightObjPositive")!],
        },
        {
          id: IndicatorState.NEGATIVE,
          loop: true,
          frameCount: 4,
          assetVariants: [AssetManager.getImageAsset("UIHighlightObjNegative")!],
        },
      ],
    };

    super({
      worldPos,
      entityId,
      size,
      instance: {
        price: 0,
        coinSpritesheet: SpriteSheet.fromGrid(AssetManager.getImageAsset("SCoin")!, 128, 128, 6),
        opacity: 0,
        desiredOpacity: 0,
      },
      animations,
      initialState: IndicatorState.NEUTRAL,
      collisionPoints: EntityCollisionShape.GetRectangle({ x: -size / 2, y: -size / 2 }, { x: size / 2, y: size / 2 }),
    });

    this._animations?.setActiveAnimations([this._getState()]);
    this.shopItem = shopItem;

    Matter.Events.on(EntityManager._physicsEngine, "collisionStart", this._onCollisionStart);
    Matter.Events.on(EntityManager._physicsEngine, "collisionEnd", this._onCollisionEnd);
  }

  public _engine: AEntityEngineBody = {
    updateBefore: (_deltaTime) => {
      const { ShopManager } = _game.MANAGERS;

      this._animations?.setActiveAnimations([this._getState()]);
      this._instance.opacity = lerp(this._instance.opacity, this._instance.desiredOpacity, _deltaTime * 12);

      if (this._getState() === IndicatorState.NEUTRAL && ShopManager.canAfford(this.shopItem.id)) {
        this._setState(IndicatorState.POSITIVE);
      }
    },

    draw: () => {
      const { DrawManager, AssetManager } = _game.MANAGERS;
      this._animations?.drawActiveAnimations(this._getWorldPosition(), this._getSize() * 1.2, DrawManager, {
        zIndex: ZIndex.INDICATORS,
        alpha: this._getState() === IndicatorState.NEUTRAL ? 0.45 : 1,
      });
      this.shopItem.renderItem(this._getWorldPosition(), AssetManager, DrawManager, { alpha: this.alpha });
    },

    drawShadow: () => {
      const { DrawManager, AssetManager } = _game.MANAGERS;
      const { x, y } = this._getWorldPosition();
      const shadowSprite = AssetManager.getImageAsset("IFXEntityShadow");
      const size = this._getSize() * 0.85;

      if (!shadowSprite) return;
      DrawManager.queueDraw(x - size / 2, y - size * 0.5, shadowSprite, size, size, ZIndex.GROUND_EFFECTS, 0, 0.85);
    },

    drawDebug: () => {},

    onDestroy: () => {
      const { EntityManager } = _game.MANAGERS;
      Matter.Events.off(EntityManager._physicsEngine, "collisionStart", this._onCollisionStart);
      Matter.Events.off(EntityManager._physicsEngine, "collisionEnd", this._onCollisionEnd);
      EntityManager.destroyEntity(this._entityId);
    },
  };

  public setPositive() {
    this._setState(IndicatorState.POSITIVE);
  }
  public setNegative() {
    this._setState(IndicatorState.NEGATIVE);
  }
  public setNeutral() {
    this._setState(IndicatorState.NEUTRAL);
  }

  private _onCollisionStart = (event: Matter.IEventCollision<Matter.Engine>) => {
    const { LevelManager, UIManager, ShopManager } = _game.MANAGERS;

    for (const pair of event.pairs) {
      const other =
        pair.bodyA === this._physicsBody ? pair.bodyB : pair.bodyB === this._physicsBody ? pair.bodyA : null;
      if (!other) continue;

      const entity = other.plugin?.entity;
      if (entity !== LevelManager.player) continue;

      if (!ShopManager.canAfford(this.shopItem.id)) this.setNegative();
      else this.setPositive();

      UIManager.showShopUI(this.shopItem);

      this.alpha = 0.7;
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

      UIManager.hideShopUI();

      this.setNeutral();
      this.alpha = 1;
    }
  };
}
