import { gridToWorld, type GridPosition } from "../config/gameGrid";
import { gameInstance } from "../main";
import { ZIndex } from "../managers/DrawManager";
import AEntity from "./AEntity";

export default class BlockWood extends AEntity {
  public health: number = 100;

  constructor(gridPos: GridPosition) {
    super(gridToWorld(gridPos), false);
  }

  update(_deltaTime: number) {}

  draw() {
    const sprite = gameInstance.MANAGERS.AssetManager.getImageAsset("IBlockWood");
    if (!sprite) return;

    gameInstance.MANAGERS.DrawManager.queueDraw(this.worldPos.x, this.worldPos.y, sprite, 64, 64, ZIndex.ENTITIES, 0);
  }

  damage(amount: number) {
    this.health -= amount;
    if (this.health <= 0) {
      gameInstance.MANAGERS.AssetManager.playAudioAsset("ABlockWoodDestroyed", "sound");
      gameInstance.MANAGERS.LevelManager.destroyEntity(this, "block");
    } else {
      gameInstance.MANAGERS.AssetManager.playAudioAsset("ABlockWoodDamaged", "sound", 0.7);
    }
  }
}
