import { GRID_CONFIG, gridToWorld, type GridPosition } from "../config/gameGrid";
import type GameInstance from "../GameInstance";
import { ZIndex } from "../managers/DrawManager";
import AEntity from "./AEntity";

export default class BlockWood extends AEntity {
  private gameInstance: GameInstance;
  public health: number = 100;

  constructor(gridPos: GridPosition, entityId: number, gameInstance: GameInstance) {
    super(gridToWorld(gridPos), entityId, false);
    this.gameInstance = gameInstance;
  }

  update(_deltaTime: number) { }

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
    this.health -= amount;
    if (this.health <= 0) {
      this.gameInstance.MANAGERS.AssetManager.playAudioAsset("ABlockWoodDestroyed", "sound");
      this.gameInstance.MANAGERS.LevelManager.destroyEntity(this.entityId, "block");
    } else {
      this.gameInstance.MANAGERS.AssetManager.playAudioAsset("ABlockWoodDamaged", "sound", 0.7);
    }
  }
}
