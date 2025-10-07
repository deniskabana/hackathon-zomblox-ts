import type { WorldPosition } from "../config/gameGrid";
import { gameInstance } from "../main";
import { ZIndex } from "../managers/DrawManager";
import AEntity from "./AEntity";

export default class Player extends AEntity {
  constructor(worldPos: WorldPosition) {
    super(worldPos, true);
  }

  public update(_deltaTime: number) {

  }

  public draw(_deltaTime: number) {
    const playerSprite =
      gameInstance.MANAGERS.AssetManager.getImageAsset("IPlayerGunShotgun");
    if (!playerSprite) return;


    gameInstance.MANAGERS.DrawManager.queueDraw(
      this.worldPos.x,
      this.worldPos.y,
      playerSprite,
      64,
      64,
      ZIndex.ENTITIES,
      this.getAimAngle() + Math.PI / 2,
    );
  }

  private getAimAngle(): number {
    const mousePos = gameInstance.MANAGERS.InputManager.mouseWorldPos;
    const dx = mousePos.x - this.worldPos.x;
    const dy = mousePos.y - this.worldPos.y;
    return Math.atan2(dy, dx);
  }
}

