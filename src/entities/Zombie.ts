import { GRID_CONFIG, gridToWorld, worldToGrid, type GridPosition, type WorldPosition } from "../config/gameGrid";
import type GameInstance from "../GameInstance";
import { ZIndex } from "../managers/DrawManager";
import { GridTileState } from "../types/Grid";
import type { Vector } from "../types/Vector";
import getDirectionalAngle from "../utils/getDirectionalAngle";
import getVectorDistance from "../utils/getVectorDistance";
import radialLerp from "../utils/radialLerp";
import radiansToVector from "../utils/radiansToVector";
import AEntity from "./AEntity";

export default class Zombie extends AEntity {
  private gameInstance: GameInstance;
  public health: number;

  private isWalking: boolean;
  private speed: number;
  private distanceFromPlayer: number = Infinity;
  private angle: number = 0;
  private desiredAngle: number | undefined;
  private moveTargetPos: WorldPosition | undefined;

  constructor(gridPos: GridPosition, entityId: number, gameInstance: GameInstance) {
    super(gridToWorld(gridPos), entityId, true);
    this.gameInstance = gameInstance;
    this.isWalking = true;
    this.health = 100 + (Math.random() - 0.5) * 50;
    this.speed = 50 + (Math.random() - 0.5) * 20;
  }

  // TODO: Obstacle avoidance / collision handling
  public update(_deltaTime: number) {
    if (!this.isWalking) return;

    const playerPos = this.gameInstance.MANAGERS.LevelManager.player.worldPos;
    this.distanceFromPlayer = getVectorDistance(this.worldPos, playerPos);

    if (this.distanceFromPlayer < GRID_CONFIG.TILE_SIZE * 1.5) return;

    const flowField = this.gameInstance.MANAGERS.LevelManager.flowField;

    if (this.gameInstance.MANAGERS.LevelManager.isInsideGrid(this.gridPos) && flowField) {
      const fieldCell = flowField[this.gridPos.x][this.gridPos.y];

      const bestValueNeighbor = fieldCell.neighbors.reduce<Vector>((acc, val) => {
        if (!acc || flowField[val.x][val.y].distance < flowField[acc.x][acc.y].distance) return val;
        return acc;
      }, this.gridPos); // BUG: Known issue - if zombie's gridPos enters a block, it panics af

      this.moveTargetPos = gridToWorld(bestValueNeighbor, true);
    } else {
      this.moveTargetPos = playerPos;
    }

    // Apply movement
    const vector = radiansToVector(this.angle); // TODO: Calculate less times
    this.desiredAngle = getDirectionalAngle(this.moveTargetPos, this.worldPos);
    if (this.angle !== this.desiredAngle)
      this.angle = radialLerp(this.angle, this.desiredAngle, Math.min(1, _deltaTime * 3.5));
    const futurePos = {
      x: this.worldPos.x + vector.x * this.speed * _deltaTime,
      y: this.worldPos.y + vector.y * this.speed * _deltaTime,
    };
    if (!this.checkHasCollisions(futurePos)) this.setWorldPosition(futurePos);
  }

  public draw() {
    const sprite = this.gameInstance.MANAGERS.AssetManager.getImageAsset("IZombie1");
    if (!sprite) return;

    this.gameInstance.MANAGERS.DrawManager.queueDraw(
      this.worldPos.x - GRID_CONFIG.TILE_SIZE / 2,
      this.worldPos.y - GRID_CONFIG.TILE_SIZE / 2,
      sprite,
      GRID_CONFIG.TILE_SIZE,
      GRID_CONFIG.TILE_SIZE,
      ZIndex.ENTITIES,
      this.angle + Math.PI / 2,
    );
    const settings = this.gameInstance.MANAGERS.GameManager.getSettings();
    if (
      this.moveTargetPos &&
      this.gameInstance.MANAGERS.LevelManager.isInsideGrid(this.gridPos) &&
      settings.debug.enableFlowFieldRender
    ) {
      this.gameInstance.MANAGERS.DrawManager.drawRectOutline(
        gridToWorld(this.gridPos).x,
        gridToWorld(this.gridPos).y,
        GRID_CONFIG.TILE_SIZE,
        GRID_CONFIG.TILE_SIZE,
        "#00aaeeaa",
        1,
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

  private checkHasCollisions(futurePos: WorldPosition): boolean {
    const levelGrid = this.gameInstance.MANAGERS.LevelManager.levelGrid;
    const gridPos = worldToGrid(futurePos);
    // It's a zombie. Just stop it and give it time to rotate
    if (levelGrid[gridPos.x]?.[gridPos.y]?.state === GridTileState.BLOCKED) return true;

    return false;
  }
}
