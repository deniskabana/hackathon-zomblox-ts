import { GRID_CONFIG, gridToWorld, type GridPosition } from "../config/gameGrid";
import type GameInstance from "../GameInstance";
import { ZIndex } from "../managers/DrawManager";
import { vectorIdToVector, vectorToVectorId, type VectorId } from "../utils/generateFlowFieldMap";
import getDirectionalAngle from "../utils/getDirectionalAngle";
import getVectorDistance from "../utils/getVectorDistance";
import normalizeVector from "../utils/normalizeVector";
import radiansToVector from "../utils/radiansToVector";
import AEntity from "./AEntity";

export default class Zombie extends AEntity {
  private gameInstance: GameInstance;
  private isWalking: boolean;
  private angle: number = 0;
  private speed: number = 60 + (Math.random() - 0.5) * 20;

  public health: number = 100 + (Math.random() - 0.5) * 50;

  private distanceFromPlayer: number = -1;
  private lastDistanceInterval: number = 0;

  constructor(gridPos: GridPosition, entityId: number, gameInstance: GameInstance) {
    super(gridToWorld(gridPos), entityId, true);
    this.gameInstance = gameInstance;
    this.isWalking = true;
  }

  public update(_deltaTime: number) {
    if (!this.isWalking) return;

    const pathFindingGrid = this.gameInstance.MANAGERS.LevelManager.pathFindingGrid
    const currentPfGridPos = pathFindingGrid?.[vectorToVectorId(this.gridPos)]
    if (currentPfGridPos) {
      const nextTile = currentPfGridPos.neighbors.reduce<VectorId | undefined>((acc, curr) => {
        if (!acc) return curr;
        if (pathFindingGrid[acc].distance > pathFindingGrid[curr]?.distance) return curr;
        return acc
      }, undefined);

      if (nextTile) {
        const nextWorldPos = gridToWorld(vectorIdToVector(nextTile));
        const normalizedNextPos = normalizeVector(nextWorldPos);
        this.setWorldPosition({
          x: this.worldPos.x + normalizedNextPos.x * this.speed * _deltaTime,
          y: this.worldPos.y + normalizedNextPos.y * this.speed * _deltaTime,
        });
      }
      console.log(nextTile)
    } else {
      const playerPos = this.gameInstance.MANAGERS.LevelManager.player.worldPos;

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
      console.log(this.worldPos)
    }
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
