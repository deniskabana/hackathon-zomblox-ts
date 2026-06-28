import { GRID_CONFIG } from "../../../config/core/grid.config";
import type GameInstance from "../../../GameInstance";
import { ZIndex } from "../../../types/lib/ZIndex";
import SpriteSheet from "../../../utils/classes/SpriteSheet";
import lerp from "../../../utils/math/lerp";
import AEntity, { type AEntityEngineBody, type EntityConstructorProps } from "../../engine/AEntity";
import type { EntityAnimationsSpecs } from "../../engine/systems/EntityAnimation";
import { EntityCollisionShape } from "../../engine/systems/EntityCollisionPoints";

/** `this.gameInstance` */ let _game: GameInstance;

enum IndicatorState {
  NEUTRAL = "NEUTRAL",
  POSITIVE = "POSITIVE",
  NEGATIVE = "NEGATIVE",
}

interface Instance {
  price: number;
  isBubbleActive: boolean;
  coinSpritesheet: SpriteSheet;
  opacity: number;
  desiredOpacity: number;
}

export default class InteractiveIndicator extends AEntity<IndicatorState, Instance> {
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
          id: IndicatorState.NEUTRAL,
          loop: true,
          frameCount: 4,
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
        isBubbleActive: false,
        coinSpritesheet: SpriteSheet.fromGrid(AssetManager.getImageAsset("SCoin")!, 128, 128, 6),
        opacity: 0,
        desiredOpacity: 0,
      },
      animations,
      initialState: IndicatorState.NEUTRAL,
      collisionPoints: EntityCollisionShape.GetRectangle({ x: -size / 2, y: -size / 2 }, { x: size / 2, y: size / 2 }),
    });

    this._animations?.setActiveAnimations([this._getState()]);
  }

  public _engine: AEntityEngineBody = {
    updateBefore: (_deltaTime) => {
      this._animations?.setActiveAnimations([this._getState()]);
      this._instance.opacity = lerp(this._instance.opacity, this._instance.desiredOpacity, _deltaTime * 14);
    },

    draw: () => {
      const { DrawManager, AssetManager } = _game.MANAGERS;
      const { x, y } = this._getWorldPosition();
      const size = this._getSize();

      const offsetY = 4 * (1 - this._instance.opacity);

      this._animations?.drawActiveAnimations(this._getWorldPosition(), this._getSize() * 1.2, DrawManager, {
        zIndex: ZIndex.INDICATORS,
        alpha: 0.8,
      });

      if (this._instance.isBubbleActive || this._instance.opacity > 0) {
        const bubbleSize = GRID_CONFIG.TILE_SIZE * 1.5;
        DrawManager.queueDraw(
          x - bubbleSize / 2,
          y - bubbleSize / 2 - size + 2 + offsetY,
          AssetManager.getImageAsset("UIActionBubble")!,
          bubbleSize,
          bubbleSize,
          ZIndex.INDICATORS,
          0,
          this._instance.opacity,
        );

        DrawManager.drawText(
          `${this._instance.price || 0}`,
          x + 8,
          y - size + 4 + offsetY,
          this._getState() === IndicatorState.NEGATIVE ? "#000000b0" : " #000000",
          16,
          "Courier",
          "center",
          this._instance.opacity,
          true,
        );
        DrawManager.queueDrawSprite(
          x - bubbleSize / 2 + 11,
          y - size - 8 + offsetY,
          this._instance.coinSpritesheet,
          0,
          14,
          14,
          ZIndex.INDICATORS,
          0,
          this._instance.opacity,
        );
      }
    },

    drawDebug: () => {},
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

  public setPrice(price: number) {
    this._instance.price = price;
  }

  public showBubble() {
    this._instance.isBubbleActive = true;
    this._instance.desiredOpacity = 1;
  }
  public hideBubble() {
    this._instance.isBubbleActive = false;
    this._instance.desiredOpacity = 0;
  }
}
