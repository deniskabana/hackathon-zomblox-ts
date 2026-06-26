import { GRID_CONFIG } from "../../../config/core/grid.config";
import type GameInstance from "../../../GameInstance";
import AEntity, { type AEntityEngineBody, type EntityConstructorProps } from "../../engine/AEntity";
import type { EntityAnimationsSpecs } from "../../engine/systems/EntityAnimation";
import { EntityCollisionShape } from "../../engine/systems/EntityCollisionPoints";
import { EntityTimer } from "../../engine/systems/EntityTimer";

/** `this.gameInstance` */ let _game: GameInstance;

interface Timers {
  destroy: EntityTimer<"Destroy sensor automatically">;
}

export default class SensorAttackSlash extends AEntity<undefined, undefined, Timers> {
  constructor({ gameInstance, entityId, worldPos }: EntityConstructorProps) {
    _game = gameInstance;
    const { AssetManager } = _game.MANAGERS;

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
      timers: { destroy: new EntityTimer({ initialValue: 1, autoStart: true }) },
    });

    this._animations?.setActiveAnimations(["idle"]);
  }

  public _engine: AEntityEngineBody = {
    draw: () => {
      const { DrawManager } = _game.MANAGERS;
      const size = this._getSize();
      this._animations?.drawActiveAnimations(this._getWorldPosition(), size, DrawManager);
    },

    drawDebug: () => {},
  };
}
