import { GRID_CONFIG, gridToWorld, type GridPosition } from "../config/gameGrid";
import type GameInstance from "../GameInstance";
import { ZIndex } from "../types/ZIndex";
import AEntity from "./abstract/AEntity";

export default class BlockWood extends AEntity {
  private gameInstance: GameInstance;
  public health: number;

  constructor(gridPos: GridPosition, entityId: number, gameInstance: GameInstance) {
    super(gridToWorld(gridPos), entityId, false);
    this.gameInstance = gameInstance;

    const settings = this.gameInstance.MANAGERS.GameManager.getSettings().rules.blocks;
    this.health = settings.woodStartHealth;
  }

  update(_deltaTime: number) {}

  draw() {
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

  damage(amount: number) {
    const settings = this.gameInstance.MANAGERS.GameManager.getSettings().rules.game;
    if (!settings.enableBlocksDestruction) return;

    this.health -= amount;
    if (this.health <= 0) {
      this.gameInstance.MANAGERS.AssetManager.playAudioAsset("ABlockWoodDestroyed", "sound");
      this.gameInstance.MANAGERS.LevelManager.destroyEntity(this.entityId, "block");
    } else {
      this.gameInstance.MANAGERS.AssetManager.playAudioAsset("ABlockWoodDamaged", "sound", 0.7);
    }
  }
}
