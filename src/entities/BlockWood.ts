import { GRID_CONFIG, gridToWorld, type GridPosition } from "../config/gameGrid";
import type GameInstance from "../GameInstance";
import { EntityType } from "../types/EntityType";
import { ZIndex } from "../types/ZIndex";
import ABlock from "./abstract/ABlock";

export default class BlockWood extends ABlock {
  public health: number;

  constructor(gridPos: GridPosition, entityId: number, gameInstance: GameInstance) {
    super(gameInstance, gridToWorld(gridPos), entityId, false);

    const settings = this.gameInstance.MANAGERS.GameManager.getSettings().rules.blocks;
    this.health = settings.woodStartHealth;
  }

  public update(_deltaTime: number): void {}

  public draw(): void {
    const sprite = this.gameInstance.MANAGERS.AssetManager.getImageAsset("IBlockWood");
    if (!sprite) return;
    this.gameInstance.MANAGERS.DrawManager.queueDraw(
      this.worldPos.x,
      this.worldPos.y,
      sprite,
      GRID_CONFIG.TILE_SIZE,
      GRID_CONFIG.TILE_SIZE,
      ZIndex.BLOCKS,
      0,
    );
  }

  public drawMask(ctx: CanvasRenderingContext2D): void {
    const { CameraManager } = this.gameInstance.MANAGERS;
    const zoom = CameraManager.zoom;

    if (!ctx || !CameraManager.isOnScreen(this.worldPos)) return;

    const screenPos = CameraManager.worldToScreen(this.worldPos);
    ctx.save();
    ctx.fillStyle = `#000`;
    ctx.fillRect(screenPos.x, screenPos.y, GRID_CONFIG.TILE_SIZE * zoom, GRID_CONFIG.TILE_SIZE * zoom);
    ctx.restore();
  }

  damage(amount: number) {
    const settings = this.gameInstance.MANAGERS.GameManager.getSettings().rules.game;
    if (!settings.enableBlocksDestruction) return;

    this.health -= amount;
    if (this.health <= 0) {
      this.gameInstance.MANAGERS.AssetManager.playAudioAsset("ABlockWoodDestroyed", "sound");
      this.gameInstance.MANAGERS.LevelManager.destroyEntity(this.entityId, EntityType.BLOCK);
    } else {
      this.gameInstance.MANAGERS.AssetManager.playAudioAsset("ABlockWoodDamaged", "sound", 0.7);
    }
  }
}
