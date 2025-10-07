import type { WorldPosition } from "../config/gameGrid";
import { gameInstance } from "../main";
import { ZIndex } from "../managers/DrawManager";
import AEntity from "./AEntity";

export default class Zombie extends AEntity {
  constructor(worldPos: WorldPosition) {
    super(worldPos, true);
  }

  public update(_deltaTime: number) {
  }

  public draw(_deltaTime: number) {
    const sprite =
      gameInstance.MANAGERS.AssetManager.getImageAsset("IZombie1");
    if (!sprite) return;

    const dx = gameInstance.MANAGERS.LevelManager.player.worldPos.x - this.worldPos.x;
    const dy = gameInstance.MANAGERS.LevelManager.player.worldPos.y - this.worldPos.y;
    const angle = Math.atan2(dy, dx);

    gameInstance.MANAGERS.DrawManager.queueDraw(
      this.worldPos.x,
      this.worldPos.y,
      sprite,
      64,
      64,
      ZIndex.ENTITIES,
      angle + Math.PI / 2,
    );
  }
}
