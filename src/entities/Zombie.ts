import { GRID_CONFIG, gridToWorld, type GridPosition } from "../config/gameGrid";
import type GameInstance from "../GameInstance";
import { ZIndex } from "../managers/DrawManager";
import type { Vector } from "../types/Vector";
import { vectorIdToVector, vectorToVectorId, type VectorId } from "../utils/generateFlowFieldMap";
import getDirectionalAngle from "../utils/getDirectionalAngle";
import getVectorDistance from "../utils/getVectorDistance";
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

  // FIXME: Refactor to only ask for directions once destination is reached
  // TODO: Obstacle avoidance / handling non-available grid positions / collision handling
  public update(_deltaTime: number) {
    if (!this.isWalking) return;

    const playerPos = this.gameInstance.MANAGERS.LevelManager.player.worldPos;

    if (this.lastDistanceInterval > 0) {
      this.lastDistanceInterval -= _deltaTime;
    } else {
      // Keep this throttled! It's a zombie, it can be stupid
      this.distanceFromPlayer = getVectorDistance(this.worldPos, playerPos);
      this.lastDistanceInterval = 0.2;
    }

    if (this.distanceFromPlayer < 70) return;

    const pathFindingGrid = this.gameInstance.MANAGERS.LevelManager.pathFindingGrid
    const currentPathGridPos = pathFindingGrid?.[vectorToVectorId(this.gridPos)]

    if (this.gameInstance.MANAGERS.LevelManager.isInsideGrid(this.gridPos)) {
      let lowestDistanceId: VectorId = vectorToVectorId(this.gridPos);
      if (!currentPathGridPos) throw new Error('Pathfinding grid not found (Zombie.ts)');

      for (const neighborId of currentPathGridPos.neighbors) {
        const neighbor = pathFindingGrid[neighborId];
        if (!neighbor || neighbor.distance < pathFindingGrid[lowestDistanceId]?.distance) {
          lowestDistanceId = neighborId;
        }
      }

      this.angle = getDirectionalAngle(gridToWorld(vectorIdToVector(lowestDistanceId)), this.worldPos);
      console.log(lowestDistanceId)
    } else {
      this.angle = getDirectionalAngle(playerPos, this.worldPos);
      console.log(this.angle)
    }

    const vector = radiansToVector(this.angle);
    this.setWorldPosition({
      x: this.worldPos.x + vector.x * this.speed * _deltaTime,
      y: this.worldPos.y + vector.y * this.speed * _deltaTime,
    });

    // if (currentPfGridPos && currentPfGridPos.neighbors) {
    //   let lowestDistanceNeighbor: VectorId = vectorToVectorId(this.gridPos)
    //
    //   currentPfGridPos.neighbors.forEach((vectorId) => {
    //     const neighbor = pathFindingGrid[vectorId];
    //     if (!lowestDistanceNeighbor || neighbor.distance < pathFindingGrid[lowestDistanceNeighbor].distance) {
    //       lowestDistanceNeighbor = vectorId;
    //     }
    //   });
    //
    //   const nextTarget = gridToWorld(vectorIdToVector(lowestDistanceNeighbor));
    //   nextTarget.x += GRID_CONFIG.TILE_SIZE / 2;
    //   nextTarget.y += GRID_CONFIG.TILE_SIZE / 2;
    //   this.angle = getDirectionalAngle(nextTarget, this.worldPos);
    //
    //   console.log({
    //     currentPfGridPos, gridPos: this.gridPos, lowestDistanceNeighbor, nextTarget
    //   })
    // }
    //
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
