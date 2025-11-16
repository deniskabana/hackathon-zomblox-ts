import { GRID_CONFIG, gridToWorld, type GridPosition } from "../../config/gameGrid";
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
    const gameSettings = this.gameInstance.MANAGERS.GameManager.getSettings().rules.game;
    if (gameSettings.enableRewardAutoCollect) setTimeout(this.handleCollected.bind(this));
    this.coinLifetimeTimer = gameSettings.coinLifetime;

    const coinImage = this.gameInstance.MANAGERS.AssetManager.getImageAsset("SCoin");
    this.fps = 10;
    if (coinImage) this.animation = AnimatedSpriteSheet.fromGrid(coinImage, 128, 128, 6, this.fps, true);
  }

  public update(_deltaTime: number): void {
    this.animation?.update(Math.min(_deltaTime, 1 / this.fps));
    const player = this.gameInstance.MANAGERS.LevelManager.player;
    const playerDistance = player
      ? getVectorDistance(
          { x: player.worldPos.x - GRID_CONFIG.TILE_SIZE / 2, y: player.worldPos.y - GRID_CONFIG.TILE_SIZE / 2 },
          this.worldPos,
        )
      : Infinity;
    if (playerDistance < GRID_CONFIG.TILE_SIZE * 0.75) this.handleCollected();

    if (this.coinLifetimeTimer >= 0) this.coinLifetimeTimer -= _deltaTime;
    else this.gameInstance.MANAGERS.LevelManager.destroyEntity(this.entityId, EntityType.COLLECTABLE);
  }

  public draw(): void {
    if (!this.animation) return;

    const size = GRID_CONFIG.TILE_SIZE / 3;

    this.drawShadow(size);
    this.gameInstance.MANAGERS.DrawManager.queueDrawSprite(
      this.worldPos.x - size / 2,
      this.worldPos.y - size / 2,
      this.animation,
      this.animation.getCurrentFrame(),
      size,
      size,
      ZIndex.ENTITIES,
      0,
    );
  }

  public drawShadow(size: number): void {
    const { DrawManager, AssetManager } = this.gameInstance.MANAGERS;

    const shadowSprite = AssetManager.getImageAsset("IFXEntityShadow");
    if (shadowSprite)
      DrawManager.queueDraw(
        this.worldPos.x - size / 2,
        this.worldPos.y - size / 1.75,
        shadowSprite,
        size,
        size,
        ZIndex.ENTITIES,
      );
  }

  public damage(): void {}
  public destroy(): void {}

  private handleCollected(): void {
    const { AssetManager, LevelManager } = this.gameInstance.MANAGERS;
    AssetManager.playAudioAsset("AFXCoinCollected", "sound", 0.3);
    LevelManager.addCurrency(1);
    LevelManager.destroyEntity(this.entityId, EntityType.COLLECTABLE);
  }
}
