import { GRID_CONFIG } from "../../../config/core/grid.config";
import type GameInstance from "../../../GameInstance";
import { ZIndex } from "../../../types/lib/ZIndex";
import SpriteSheet from "../../../utils/classes/SpriteSheet";
import AEntity, { type AEntityEngineBody, type AnyEntity, type EntityConstructorProps } from "../../engine/AEntity";
import type { EntityAnimationsSpecs } from "../../engine/systems/EntityAnimation";
import { EntityCollisionShape } from "../../engine/systems/EntityCollisionPoints";
import { type ShopItem } from "../../../config/game/shop.config";
import Matter from "matter-js";
import type { Weapon } from "../../../config/game/weapons.config";

/** `this.gameInstance` */ let _game: GameInstance;

enum IndicatorState {
  NEUTRAL = "NEUTRAL",
  POSITIVE = "POSITIVE",
}

interface Instance {
  price: number;
  coinSpritesheet: SpriteSheet;
}

export default class InteractiveOwnedWeapon extends AEntity<IndicatorState, Instance> {
  private weapon: Weapon;
  private shopItem: ShopItem;
  private alpha: number = 1;

  constructor({
    gameInstance,
    entityId,
    worldPos,
    shopItem,
    weapon,
  }: EntityConstructorProps & { shopItem: ShopItem; weapon: Weapon }) {
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
          assetVariants: [AssetManager.getImageAsset("UIHighlightObj")!],
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
      },
      animations,
      initialState: IndicatorState.NEUTRAL,
      collisionPoints: EntityCollisionShape.GetRectangle({ x: -size / 2, y: -size / 2 }, { x: size / 2, y: size / 2 }),
    });

    this._animations?.setActiveAnimations([this._getState()]);
    this.shopItem = shopItem;
    this.weapon = weapon;

    Matter.Events.on(EntityManager._physicsEngine, "collisionStart", this._onCollisionStart);
    Matter.Events.on(EntityManager._physicsEngine, "collisionEnd", this._onCollisionEnd);
  }

  public _engine: AEntityEngineBody = {
    updateBefore: (_deltaTime) => {
      this._animations?.setActiveAnimations([this._getState()]);
    },

    draw: () => {
      const { DrawManager, AssetManager, LevelManager } = _game.MANAGERS;

      if (!LevelManager.getIsDay()) return;

      this._animations?.drawActiveAnimations(this._getWorldPosition(), this._getSize() * 1.2, DrawManager, {
        zIndex: ZIndex.INTERACTIVE,
        alpha: this._getState() === IndicatorState.NEUTRAL ? 0.45 : 1,
      });
      this.shopItem.renderItem(this._getWorldPosition(), AssetManager, DrawManager, { alpha: this.alpha });
    },

    drawShadow: () => {
      const { DrawManager, AssetManager, LevelManager } = _game.MANAGERS;
      const { x, y } = this._getWorldPosition();
      const shadowSprite = AssetManager.getImageAsset("IFXEntityShadow");
      const size = this._getSize() * 0.85;

      if (!LevelManager.getIsDay()) return;
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

  private setPositive() {
    this._setState(IndicatorState.POSITIVE);
  }
  private setNeutral() {
    this._setState(IndicatorState.NEUTRAL);
  }

  private _onCollisionStart = (event: Matter.IEventCollision<Matter.Engine>) => {
    const { LevelManager, UIManager } = _game.MANAGERS;

    if (!LevelManager.getIsDay()) return;

    for (const pair of event.pairs) {
      const other =
        pair.bodyA === this._physicsBody ? pair.bodyB : pair.bodyB === this._physicsBody ? pair.bodyA : null;
      if (!other) continue;

      const entity = other.plugin?.entity as AnyEntity | undefined;
      if (!entity || entity !== LevelManager.player) continue;

      UIManager.showEquipUI(this.shopItem);
      this.setPositive();
      this.alpha = 0.5;
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

      UIManager.hideEquipUI();
      this.setNeutral();
      this.alpha = 1;
    }
  };

  public equipWeapon(): void {
    const { LevelManager } = _game.MANAGERS;
    if (!LevelManager.getIsDay()) return;
    LevelManager.player?.equipWeapon(this.weapon);
  }
}
