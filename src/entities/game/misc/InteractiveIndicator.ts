import { GRID_CONFIG } from "../../../config/core/grid.config";
import type GameInstance from "../../../GameInstance";
import { ZIndex } from "../../../types/lib/ZIndex";
import AEntity, { type AEntityEngineBody, type EntityConstructorProps } from "../../engine/AEntity";
import type { EntityAnimationsSpecs } from "../../engine/systems/EntityAnimation";
import { EntityCollisionShape } from "../../engine/systems/EntityCollisionPoints";

/** `this.gameInstance` */ let _game: GameInstance;

enum IndicatorState {
  NEUTRAL = "NEUTRAL",
  POSITIVE = "POSITIVE",
  NEGATIVE = "NEGATIVE",
}

export default class InteractiveIndicator extends AEntity<IndicatorState> {
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
      animations,
      initialState: IndicatorState.NEUTRAL,
      collisionPoints: EntityCollisionShape.GetRectangle({ x: -size / 2, y: -size / 2 }, { x: size / 2, y: size / 2 }),
    });

    this._animations?.setActiveAnimations([this._getState()]);
  }

  public _engine: AEntityEngineBody = {
    updateBefore: () => {
      this._animations?.setActiveAnimations([this._getState()]);
    },

    draw: () => {
      const { DrawManager } = _game.MANAGERS;
      this._animations?.drawActiveAnimations(this._getWorldPosition(), this._getSize() * 1.2, DrawManager, {
        zIndex: ZIndex.INDICATORS,
        alpha: 0.8,
      });
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
}
