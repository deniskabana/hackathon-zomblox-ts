import { GRID_CONFIG, gridToWorld, type WorldPosition } from "../../../config/core/grid.config";
import type GameInstance from "../../../GameInstance";
import { ZIndex } from "../../../types/lib/ZIndex";
import getVectorDistance from "../../../utils/math/getVectorDistance";
import AEntity, { type EntityConstructorProps, type AEntityEngine } from "../../engine/AEntity";
import type { EntityAnimationsSpecs } from "../../engine/systems/EntityAnimation";
import { EntityTimer } from "../../engine/systems/EntityTimer";

/** `this.gameInstance` */ let _game: GameInstance;

interface Timers {
  coinLifetime: EntityTimer<"Duration in seconds">;
}

interface Instance {
  playerDistance: number;
  lightSourceId: number | undefined;
}

export default class Coin extends AEntity<undefined, Instance, Timers> {
  constructor({ gameInstance, entityId, gridPos }: EntityConstructorProps) {
    _game = gameInstance;
    const { LightManager, AssetManager, SettingsManager } = _game.MANAGERS;
    const { lifetimeCoin } = SettingsManager.getSettings().collectables;
    const size = GRID_CONFIG.TILE_SIZE / 3;
    const timers: Timers = {
      coinLifetime: new EntityTimer({ initialValue: lifetimeCoin, autoStart: true }),
    };

    const lightPos: WorldPosition = gridToWorld({
      x: gridPos.x - 0.5,
      y: gridPos.y - 0.5,
    });
    const instance: Instance = {
      playerDistance: Infinity,
      lightSourceId: LightManager.addLightSource(lightPos, 2.25, 0.4),
    };

    const animations: EntityAnimationsSpecs = {
      frameWidth: 128,
      frameHeight: 128,
      fps: 10,
      animations: [{ id: "coin", assetVariants: [AssetManager.getImageAsset("SCoin")!], frameCount: 6 }],
    };

    super({
      worldPos: gridToWorld(gridPos),
      health: Infinity,
      entityId,
      size,
      animations,
      timers,
      initialState: undefined,
      instance,
    });
  }

  public _engine: AEntityEngine = {
    draw: () => {
      const { DrawManager } = _game.MANAGERS;
      this._animations?.drawActiveAnimations(this._getWorldPosition(), this._getSize(), DrawManager);
    },

    drawShadow: () => {
      const { DrawManager, AssetManager } = _game.MANAGERS;
      const size = this._getSize();
      const { x, y } = this._getWorldPosition();
      const shadowSprite = AssetManager.getImageAsset("IFXEntityShadow");

      if (shadowSprite) DrawManager.queueDraw(x - size / 2, y - size / 1.75, shadowSprite, size, size, ZIndex.ENTITIES);
    },

    drawDebug: () => {},

    updateBefore: () => {
      const { LevelManager, SettingsManager } = _game.MANAGERS;
      const { autoCollect } = SettingsManager.getSettings().collectables;
      const player = LevelManager.player;

      if (autoCollect) this.handleCollected();
      if (!player) return;

      const { x: playerX, y: playerY } = player._getWorldPosition();
      this._instance.playerDistance = player
        ? getVectorDistance(
            { x: playerX - GRID_CONFIG.TILE_SIZE / 2, y: playerY - GRID_CONFIG.TILE_SIZE / 2 },
            this._getWorldPosition(),
          )
        : Infinity;
    },

    onDestroy: () => {
      const { LightManager } = _game.MANAGERS;
      const { lightSourceId } = this._instance;
      if (lightSourceId) LightManager.removeLightSource(lightSourceId);
    },

    updateAfter: () => {
      const { SettingsManager } = _game.MANAGERS;
      const { minDistanceFromPlayerPx } = SettingsManager.getSettings().collectables;

      if (this._instance.playerDistance < minDistanceFromPlayerPx) this.handleCollected();
      if (this._timers.coinLifetime.getIsDone()) this._destructor();
    },
  };

  private handleCollected(): void {
    const { AssetManager, LevelManager, EntityManager, SettingsManager } = _game.MANAGERS;
    const settings = SettingsManager.getSettings().rules;

    AssetManager.playAudioAsset("AFXCoinCollected", "sound", 0.3);
    LevelManager.addCurrency(1 * settings.incomeScale);
    EntityManager.destroyEntity(this._entityId);
  }
}
