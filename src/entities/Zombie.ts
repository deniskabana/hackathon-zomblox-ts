import type { WorldPosition } from "../config/gameGrid";
import { gameInstance } from "../main";
import { ZIndex } from "../managers/DrawManager";
import getDirectionalAngle from "../utils/getDirectionalAngle";
import radiansToVector from "../utils/radiansToVector";
import AEntity from "./AEntity";

export default class Zombie extends AEntity {
  private isWalking: boolean;
  private angle: number = 0;
  private speed: number = 60;

  private health: number = 40;

  constructor(worldPos: WorldPosition) {
    super(worldPos, true);

    this.isWalking = true;
  }

  public update(_deltaTime: number) {
    if (!this.isWalking) return;

    // TODO: Replace with actual logic

    this.angle = getDirectionalAngle(gameInstance.MANAGERS.LevelManager.player.worldPos, this.worldPos);
    const vector = radiansToVector(this.angle);

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

  public getHealth(): number {
    return this.health;
  }

  public damage(amount: number): void {
    this.health -= amount;
    if (this.health <= 0) {
      gameInstance.MANAGERS.AssetManager.playAudioAsset('AZombieDeath', 'sound');
      this.killZombie();
    }
    console.log('ZOMBIE HEALTH: ', this.health);
  }

  public killZombie(): void {
    // TODO: Death mechanic ???
  }
}
