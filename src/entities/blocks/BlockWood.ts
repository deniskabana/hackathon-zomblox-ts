import { GRID_CONFIG, gridToWorld, type GridPosition } from "../../config/gameGrid";
import type GameInstance from "../../GameInstance";
import { EntityType } from "../../types/EntityType";
import { ZIndex } from "../../types/ZIndex";
import ABlock from "../abstract/ABlock";

export default class BlockWood extends ABlock {
  public health: number;

  constructor(gridPos: GridPosition, entityId: number, gameInstance: GameInstance) {
    super(gameInstance, gridToWorld(gridPos), entityId, false);

    const settings = this.gameInstance.MANAGERS.GameManager.getSettings().rules.blocks;
    this.health = settings.woodStartHealth;
  }

  public update(_deltaTime: number): void {}

  public draw(): void {
    const tileset = this.gameInstance.MANAGERS.LevelManager.getTileset();
    if (!tileset) return;

    const spriteTop = tileset.getTileFrame(469 + 1);
    const spriteBottom = tileset.getTileFrame(509 + 1);
    if (!spriteTop || !spriteBottom) return;

    this.gameInstance.MANAGERS.DrawManager.queueDrawSprite(
      this.worldPos.x,
      this.worldPos.y,
      spriteBottom.spriteSheet,
      spriteBottom.frameIndex,
      GRID_CONFIG.TILE_SIZE,
      GRID_CONFIG.TILE_SIZE,
      ZIndex.BLOCKS,
      0,
    );
    this.gameInstance.MANAGERS.DrawManager.queueDrawSprite(
      this.worldPos.x,
      this.worldPos.y - GRID_CONFIG.TILE_SIZE,
      spriteTop.spriteSheet,
      spriteTop.frameIndex,
      GRID_CONFIG.TILE_SIZE,
      GRID_CONFIG.TILE_SIZE,
      ZIndex.MAP_OVERLAY,
      0,
    );
  }

  damage(amount: number) {
    const settings = this.gameInstance.MANAGERS.GameManager.getSettings().rules.game;
    if (!settings.enableBlocksDestruction) return;

    this.health -= amount;
    if (this.health <= 0) {
      this.gameInstance.MANAGERS.AssetManager.playAudioAsset("ABlockWoodDestroyed", "sound");
      this.gameInstance.MANAGERS.LevelManager.destroyEntity(this.entityId, EntityType.BLOCK);
    } else {
      this.gameInstance.MANAGERS.AssetManager.playAudioAsset("ABlockWoodDamaged", "sound", 0.5);
    }
  }

  public destroy(): void {}

  public drawShadow(): void {}
}
