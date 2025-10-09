import { gridToWorld, type GridPosition } from "../config/gameGrid";
import { gameInstance } from "../main";
import { ZIndex } from "../managers/DrawManager";
import getDirectionalAngle from "../utils/getDirectionalAngle";
import getVectorDistance from "../utils/getVectorDistance";
import radiansToVector from "../utils/radiansToVector";
import AEntity from "./AEntity";

export default class Zombie extends AEntity {
  private isWalking: boolean;
  private angle: number = 0;
  private speed: number = 60 + (Math.random() - 0.5) * 20;

  public health: number = 100 + (Math.random() - 0.5) * 50;

  private distanceFromPlayer: number = -1;
  private lastDistanceInterval: number = 0;

  constructor(gridPos: GridPosition, entityId: number) {
    super(gridToWorld(gridPos), entityId, true);
    this.isWalking = true;
  }

  public update(_deltaTime: number) {
    if (!this.isWalking) return;

    const playerPos = gameInstance.MANAGERS.LevelManager.player.worldPos;

    if (this.lastDistanceInterval > 0) {
      this.lastDistanceInterval -= _deltaTime;
    } else {
      // Keep this throttled! It's a zombie, it can be stupid
      this.distanceFromPlayer = getVectorDistance(this.worldPos, playerPos);
      this.lastDistanceInterval = 0.5;
    }

    if (this.distanceFromPlayer < 70) return;

    this.angle = getDirectionalAngle(playerPos, this.worldPos);
    const vector = radiansToVector(this.angle);
    this.setWorldPosition({
      x: this.worldPos.x + vector.x * this.speed * _deltaTime,
      y: this.worldPos.y + vector.y * this.speed * _deltaTime,
    });
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
      gameInstance.MANAGERS.AssetManager.playAudioAsset("AZombieDeath", "sound");
      gameInstance.MANAGERS.LevelManager.destroyEntity(this.entityId, "zombie");
    }
  }
}
