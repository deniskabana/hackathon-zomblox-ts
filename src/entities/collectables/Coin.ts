import { gridToWorld, GRID_CONFIG } from "../../config/core/grid.config";
import type GameInstance from "../../GameInstance";
import { EntityType } from "../../types/EntityType";
import { ZIndex } from "../../types/ZIndex";
import getVectorDistance from "../../utils/math/getVectorDistance";
import AEntity, { type AEntityEngine, type EntityConstructorProps } from "../abstract/AEntity";
import type { EntityAnimationsSpecs } from "../utils/EntityAnimation";
import { EntityTimer } from "../utils/EntityTimer";

/** `this.gameInstance` */ let _game: GameInstance;

interface Timers {
  coinLifetime: EntityTimer<"Duration in seconds">;
}

interface Instance {
  playerDistance: number;
}

export default class Coin extends AEntity<undefined, Instance, Timers> {
  constructor({ gameInstance, entityId, gridPos }: EntityConstructorProps) {
    _game = gameInstance;
    const { GameManager, AssetManager } = _game.MANAGERS;
    const gameSettings = GameManager.getSettings().rules.game;
    const size = GRID_CONFIG.TILE_SIZE / 3;
    const timers: Timers = { coinLifetime: new EntityTimer({ initialValue: gameSettings.coinLifetime }) };
    const instance: Instance = { playerDistance: Infinity };

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

    if (gameSettings.enableRewardAutoCollect) this.handleCollected();
  }

  public _engine: AEntityEngine = {
    draw: () => {
      const { DrawManager } = _game.MANAGERS;
      const size = GRID_CONFIG.TILE_SIZE / 3;
      this._animations?.drawActiveAnimations(this._getWorldPosition(), size, DrawManager);
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
      {
        const { LevelManager } = _game.MANAGERS;
        const player = LevelManager.player;
        if (!player) return;

        const { x: playerX, y: playerY } = player._getWorldPosition();
        this._instance.playerDistance = player
          ? getVectorDistance(
              { x: playerX - GRID_CONFIG.TILE_SIZE / 2, y: playerY - GRID_CONFIG.TILE_SIZE / 2 },
              this._getWorldPosition(),
            )
          : Infinity;
      }
    },

    updateAfter: () => {
      if (this._instance.playerDistance < GRID_CONFIG.TILE_SIZE * 0.75) this.handleCollected();
      if (this._timers.coinLifetime.getIsDone()) this._destructor();
    },
  };

  private handleCollected(): void {
    const { AssetManager, LevelManager } = _game.MANAGERS;
    AssetManager.playAudioAsset("AFXCoinCollected", "sound", 0.3);
    LevelManager.addCurrency(1);
    LevelManager.destroyEntity(this._entityId, EntityType.COLLECTABLE);
  }
}
