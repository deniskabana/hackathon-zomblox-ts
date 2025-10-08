import type { WorldPosition } from "../config/gameGrid";
import { gameInstance } from "../main";
import { ZIndex } from "../managers/DrawManager";
import AEntity from "./AEntity";

export default class Zombie extends AEntity {
  private isWalking: boolean;
  private angle: number = 0;
  private speed: number = 60;

  constructor(worldPos: WorldPosition) {
    super(worldPos, true);

    this.isWalking = true;
  }

  public update(_deltaTime: number) {
    if (!this.isWalking) return;

    // TODO: Replace with actual logic
    const dx =
      gameInstance.MANAGERS.LevelManager.player.worldPos.x - this.worldPos.x;
    const dy =
      gameInstance.MANAGERS.LevelManager.player.worldPos.y - this.worldPos.y;

    this.angle = Math.atan2(dy, dx);

    const vector: WorldPosition = {
      x: Math.cos(this.angle),
      y: Math.sin(this.angle),
    };
    this.worldPos.x += vector.x * this.speed * _deltaTime;
    this.worldPos.y += vector.y * this.speed * _deltaTime;
  }

  public draw(_deltaTime: number) {
    const sprite = gameInstance.MANAGERS.AssetManager.getImageAsset("IZombie1");
    if (!sprite) return;

    gameInstance.MANAGERS.DrawManager.queueDraw(
      this.worldPos.x,
      this.worldPos.y,
      sprite,
      64,
      64,
      ZIndex.ENTITIES,
      this.angle + Math.PI / 2,
    );
  }
}
