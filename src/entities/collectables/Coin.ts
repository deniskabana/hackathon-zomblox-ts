import { type GridPosition, gridToWorld, GRID_CONFIG } from "../../config/core/grid.config";
import type GameInstance from "../../GameInstance";
import { EntityType } from "../../types/EntityType";
import { ZIndex } from "../../types/ZIndex";
import { AnimatedSpriteSheet } from "../../utils/classes/AnimatedSpriteSheet";
import getVectorDistance from "../../utils/math/getVectorDistance";
import ACollectable from "../abstract/ACollectable";

export default class Coin extends ACollectable {
  public health: number = -1;

  private animation: AnimatedSpriteSheet | undefined;
  private fps: number;

  private coinLifetimeTimer: number;

  constructor(gridPos: GridPosition, entityId: number, gameInstance: GameInstance) {
    super(gameInstance, gridToWorld(gridPos), entityId, true);
    const gameSettings = this._gameInstance.MANAGERS.GameManager.getSettings().rules.game;
    if (gameSettings.enableRewardAutoCollect) setTimeout(this.handleCollected.bind(this));
    this.coinLifetimeTimer = gameSettings.coinLifetime;

    const coinImage = this._gameInstance.MANAGERS.AssetManager.getImageAsset("SCoin");
    this.fps = 10;
    if (coinImage) this.animation = AnimatedSpriteSheet.fromGrid(coinImage, 128, 128, 6, this.fps, true);
  }

  public update(_deltaTime: number): void {
    this.animation?.update(Math.min(_deltaTime, 1 / this.fps));
    const player = this._gameInstance.MANAGERS.LevelManager.player;
    const playerDistance = player
      ? getVectorDistance(
          { x: player._worldPos.x - GRID_CONFIG.TILE_SIZE / 2, y: player._worldPos.y - GRID_CONFIG.TILE_SIZE / 2 },
          this._worldPos,
        )
      : Infinity;
    if (playerDistance < GRID_CONFIG.TILE_SIZE * 0.75) this.handleCollected();

    if (this.coinLifetimeTimer >= 0) this.coinLifetimeTimer -= _deltaTime;
    else this._gameInstance.MANAGERS.LevelManager.destroyEntity(this._entityId, EntityType.COLLECTABLE);
  }

  public draw(): void {
    if (!this.animation) return;

    const size = GRID_CONFIG.TILE_SIZE / 3;

    this.drawShadow(size);
    this._gameInstance.MANAGERS.DrawManager.queueDrawSprite(
      this._worldPos.x - size / 2,
      this._worldPos.y - size / 2,
      this.animation,
      this.animation.getCurrentFrame(),
      size,
      size,
      ZIndex.ENTITIES,
      0,
    );
  }

  public drawShadow(size: number): void {
    const { DrawManager, AssetManager } = this._gameInstance.MANAGERS;

    const shadowSprite = AssetManager.getImageAsset("IFXEntityShadow");
    if (shadowSprite)
      DrawManager.queueDraw(
        this._worldPos.x - size / 2,
        this._worldPos.y - size / 1.75,
        shadowSprite,
        size,
        size,
        ZIndex.ENTITIES,
      );
  }

  public damage(): void {}
  public destroy(): void {}

  private handleCollected(): void {
    const { AssetManager, LevelManager } = this._gameInstance.MANAGERS;
    AssetManager.playAudioAsset("AFXCoinCollected", "sound", 0.3);
    LevelManager.addCurrency(1);
    LevelManager.destroyEntity(this._entityId, EntityType.COLLECTABLE);
  }
}
