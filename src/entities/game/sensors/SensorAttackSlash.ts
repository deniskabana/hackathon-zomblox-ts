import { GRID_CONFIG } from "../../../config/core/grid.config";
import type GameInstance from "../../../GameInstance";
import AEntity, { type AEntityEngineBody, type EntityConstructorProps } from "../../engine/AEntity";
import type { EntityAnimationsSpecs } from "../../engine/systems/EntityAnimation";
import { EntityCollisionShape } from "../../engine/systems/EntityCollisionPoints";
import { EntityTimer } from "../../engine/systems/EntityTimer";

/** `this.gameInstance` */ let _game: GameInstance;

interface Timers {
  lifetime: EntityTimer<"Destroy sensor automatically">;
}

export default class SensorAttackSlash extends AEntity<undefined, undefined, Timers> {
  constructor({ gameInstance, entityId, worldPos }: EntityConstructorProps) {
    _game = gameInstance;
    const { AssetManager, SettingsManager } = _game.MANAGERS;

    const { attackDurationSec } = SettingsManager.getSettings().zombie;

    const animations: EntityAnimationsSpecs = {
      frameWidth: 40,
      frameHeight: 40,
      fps: 7,
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
      timers: { lifetime: new EntityTimer({ initialValue: attackDurationSec, autoStart: true }) },
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

    updateAfter: () => {
      if (this._timers.lifetime.getIsDone()) this._destructor();
    },

    onDestroy: () => {
      const { EntityManager } = _game.MANAGERS;
      EntityManager.destroyEntity(this._entityId);
    },
  };
}
