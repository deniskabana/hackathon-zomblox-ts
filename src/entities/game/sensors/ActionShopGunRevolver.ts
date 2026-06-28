import { GRID_CONFIG } from "../../../config/core/grid.config";
import type GameInstance from "../../../GameInstance";
import { ZIndex } from "../../../types/lib/ZIndex";
import SpriteSheet from "../../../utils/classes/SpriteSheet";
import { clamp } from "../../../utils/math/clamp";
import AEntity, { type AEntityEngineBody, type EntityConstructorProps } from "../../engine/AEntity";
import type { EntityAnimationsSpecs } from "../../engine/systems/EntityAnimation";
import { EntityCollisionShape } from "../../engine/systems/EntityCollisionPoints";

/** `this.gameInstance` */ let _game: GameInstance;

interface Instance {
  isAvailable: boolean;
  yShift: number;
  maxYShift: number;
  yCounter: 1 | -1;
}

export default class ActionShopGunRevolver extends AEntity<undefined, Instance> {
  constructor({ gameInstance, entityId, worldPos }: EntityConstructorProps) {
    _game = gameInstance;
    const { AssetManager } = _game.MANAGERS;
    const size = GRID_CONFIG.TILE_SIZE;

    const animations: EntityAnimationsSpecs = {
      frameWidth: 32,
      frameHeight: 32,
      fps: 5,
      animations: [
        {
          id: "main",
          loop: true,
          frameCount: 4,
          assetVariants: [AssetManager.getImageAsset("UIHighlightObj")!],
        },
      ],
    };

    super({
      worldPos,
      entityId,
      instance: { isAvailable: true, yShift: 0, maxYShift: 4, yCounter: 1 },
      size,
      animations,
      initialState: undefined,
      collisionPoints: EntityCollisionShape.GetRectangle({ x: -size / 2, y: -size / 2 }, { x: size / 2, y: size / 2 }),
    });

    this._animations?.setActiveAnimations(["main"]);
  }

  public _engine: AEntityEngineBody = {
    draw: () => {
      const { DrawManager, AssetManager } = _game.MANAGERS;
      const size = this._getSize();
      const { x, y } = this._getWorldPosition();

      this._animations?.drawActiveAnimations(this._getWorldPosition(), size * 1.2, DrawManager, {
        zIndex: ZIndex.INDICATORS,
        alpha: 0.8,
      });

      const gunSize = size * 1.25;
      DrawManager.queueDrawSprite(
        x - gunSize / 2,
        y - gunSize / 2 - this._instance.yShift,
        SpriteSheet.fromGrid(AssetManager.getImageAsset("SPlayerWeapons")!, 32, 32, 12),
        3,
        gunSize,
        gunSize,
        ZIndex.GROUND_EFFECTS,
      );
    },

    updateBefore: (_deltaTime) => {
      this._instance.yShift += _deltaTime * 12 * this._instance.yCounter;
      if (this._instance.yShift >= this._instance.maxYShift) this._instance.yCounter = -1;
      if (this._instance.yShift <= -this._instance.maxYShift) this._instance.yCounter = +1;
      this._instance.yShift = clamp(-this._instance.maxYShift, this._instance.yShift, this._instance.maxYShift);
    },

    drawShadow: () => {
      const { DrawManager, AssetManager } = _game.MANAGERS;
      const { x, y } = this._getWorldPosition();
      const shadowSprite = AssetManager.getImageAsset("IFXEntityShadow");
      const size = this._getSize() * 0.75;

      if (!shadowSprite) return;
      DrawManager.queueDraw(x - size / 2, y - size / 2 + size * 0.3, shadowSprite, size, size, ZIndex.GROUND_EFFECTS);
    },

    drawDebug: () => {},
  };

  public setIsAvailable(available: boolean) {
    this._instance.isAvailable = available;
  }
}
