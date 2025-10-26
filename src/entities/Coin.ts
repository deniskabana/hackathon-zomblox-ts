import { GRID_CONFIG, gridToWorld, type GridPosition } from "../config/gameGrid";
import type GameInstance from "../GameInstance";
import { EntityType } from "../types/EntityType";
import { ZIndex } from "../types/ZIndex";
import { AnimatedSpriteSheet } from "../utils/classes/AnimatedSpriteSheet";
import AEntity from "./abstract/AEntity";

export default class Coin extends AEntity {
  public health: number = -1;
  public entityType = EntityType.COLLECTABLE;

  private animation: AnimatedSpriteSheet | undefined;
  private fps: number;
  private spriteSize: number;

  constructor(gridPos: GridPosition, entityId: number, gameInstance: GameInstance) {
    super(gameInstance, gridToWorld(gridPos), entityId, true);

    const coinImage = this.gameInstance.MANAGERS.AssetManager.getImageAsset("SCoin");
    this.fps = 10;
    this.spriteSize = GRID_CONFIG.TILE_SIZE / 3;
    if (coinImage) this.animation = AnimatedSpriteSheet.fromGrid(coinImage, 128, 128, 6, this.fps, true);
  }

  public update(_deltaTime: number): void {
    this.animation?.update(Math.min(_deltaTime, 1 / this.fps));
  }

  public draw(): void {
    if (!this.animation) return;

    this.gameInstance.MANAGERS.DrawManager.queueDrawSprite(
      this.worldPos.x + GRID_CONFIG.TILE_SIZE / 2 - this.spriteSize / 2,
      this.worldPos.y + GRID_CONFIG.TILE_SIZE / 2 - this.spriteSize / 2,
      this.animation,
      this.animation.getCurrentFrame(),
      this.spriteSize,
      this.spriteSize,
      ZIndex.ENTITIES,
      0,
    );
  }

  public damage(): void {}
}
