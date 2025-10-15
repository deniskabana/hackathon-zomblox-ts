import { GRID_CONFIG, gridToWorld, type GridPosition, type WorldPosition } from "../config/gameGrid";
import type GameInstance from "../GameInstance";
import { ZIndex } from "../managers/DrawManager";
import { vectorIdToVector, vectorToVectorId, type VectorId } from "../utils/generateFlowFieldMap";
import getDirectionalAngle from "../utils/getDirectionalAngle";
import getVectorDistance from "../utils/getVectorDistance";
import radiansToVector from "../utils/radiansToVector";
import AEntity from "./AEntity";

export default class Zombie extends AEntity {
  private gameInstance: GameInstance;
  private isWalking: boolean;
  private angle: number = 0;
  // private speed: number = 60 + (Math.random() - 0.5) * 20;
  private speed: number = 40

  public health: number = 100 + (Math.random() - 0.5) * 50;

  private distanceFromPlayer: number = Infinity;
  private lastDistanceInterval: number = 0;
  private walkingTarget: WorldPosition | undefined;

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
      this.distanceFromPlayer = getVectorDistance(this.worldPos, playerPos);
      this.lastDistanceInterval = 0.2;

      const pathFindingGrid = this.gameInstance.MANAGERS.LevelManager.pathFindingGrid
      const currentPathGridPos = pathFindingGrid?.[vectorToVectorId(this.gridPos)]

      if (this.gameInstance.MANAGERS.LevelManager.isInsideGrid(this.gridPos)) {
        let lowestDistanceId: VectorId | undefined = undefined;

        if (currentPathGridPos) {
          for (const neighborId of currentPathGridPos.neighbors) {
            const neighbor = pathFindingGrid[neighborId];
            if (!lowestDistanceId || !neighbor || neighbor.distance < pathFindingGrid[lowestDistanceId]?.distance) {
              lowestDistanceId = neighborId;
            }
          }
        }

        if (lowestDistanceId) {
          const worldVector = gridToWorld(vectorIdToVector(lowestDistanceId));
          this.walkingTarget = worldVector;
          worldVector.x += GRID_CONFIG.TILE_SIZE / 2;
          worldVector.y += GRID_CONFIG.TILE_SIZE / 2;
          this.angle = getDirectionalAngle(worldVector, this.worldPos);
        }
      } else {
        this.angle = getDirectionalAngle(playerPos, this.worldPos);
        this.walkingTarget = undefined;
      }
    }

    if (this.distanceFromPlayer < GRID_CONFIG.TILE_SIZE * 1.5) return;

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

    if (this.walkingTarget) {
      this.gameInstance.MANAGERS.DrawManager.drawRectOutline(
        this.walkingTarget.x - GRID_CONFIG.TILE_SIZE / 2,
        this.walkingTarget.y - GRID_CONFIG.TILE_SIZE / 2,
        GRID_CONFIG.TILE_SIZE,
        GRID_CONFIG.TILE_SIZE,
        '#00ff00',
        2,
      );
    }
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
