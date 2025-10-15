import { GRID_CONFIG, gridToWorld, type GridPosition } from "../config/gameGrid";
import type GameInstance from "../GameInstance";
import { ZIndex } from "../managers/DrawManager";
import type { FlowField } from "../utils/generateFlowFieldMap";
import getDirectionalAngle from "../utils/getDirectionalAngle";
import getVectorDistance from "../utils/getVectorDistance";
import radiansToVector from "../utils/radiansToVector";
import AEntity from "./AEntity";

export default class Zombie extends AEntity {
  private gameInstance: GameInstance;
  public health: number = 100 + (Math.random() - 0.5) * 50;
  private isWalking: boolean;

  // TODO: uncomment
  // private speed: number = 60 + (Math.random() - 0.5) * 20;
  private speed: number = 40;
  private distanceFromPlayer: number = Infinity;
  private angle: number = 0;

  constructor(gridPos: GridPosition, entityId: number, gameInstance: GameInstance) {
    super(gridToWorld(gridPos), entityId, true);
    this.gameInstance = gameInstance;
    this.isWalking = true;
  }

  // FIXME: Refactor to only ask for directions once destination is reached
  // TODO: Obstacle avoidance / handling non-available grid positions / collision handling
  public update(_deltaTime: number) {
    if (!this.isWalking) return;

    const playerPos = this.gameInstance.MANAGERS.LevelManager.player.worldPos;

    this.distanceFromPlayer = getVectorDistance(this.worldPos, playerPos);
    if (this.distanceFromPlayer < GRID_CONFIG.TILE_SIZE * 1.5) return;

    const flowField = this.gameInstance.MANAGERS.LevelManager.flowField;

    if (this.gameInstance.MANAGERS.LevelManager.isInsideGrid(this.gridPos) && flowField) {
      const fieldCell = flowField[this.gridPos.x][this.gridPos.y]
      const vectorFrom = { x: fieldCell.cameFrom.x - 0.5, y: fieldCell.cameFrom.y - 0.5 }
      this.angle = getDirectionalAngle(vectorFrom, this.gridPos);
    } else {
      this.angle = getDirectionalAngle(playerPos, this.worldPos);
    }

    // Apply movement
    const vector = radiansToVector(this.angle); // TODO: Calculate less times
    this.setWorldPosition({
      x: this.worldPos.x + vector.x * this.speed * _deltaTime,
      y: this.worldPos.y + vector.y * this.speed * _deltaTime,
    });
  }

  public draw() {
    const sprite = this.gameInstance.MANAGERS.AssetManager.getImageAsset("IZombie1");
    if (!sprite) return;

    this.gameInstance.MANAGERS.DrawManager.queueDraw(
      this.worldPos.x,
      this.worldPos.y,
      sprite,
      GRID_CONFIG.TILE_SIZE,
      GRID_CONFIG.TILE_SIZE,
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
      this.gameInstance.MANAGERS.AssetManager.playAudioAsset("AZombieDeath", "sound");
      this.gameInstance.MANAGERS.LevelManager.destroyEntity(this.entityId, "zombie");
    }
  }
}
