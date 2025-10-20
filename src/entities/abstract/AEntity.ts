import {
  type WorldPosition,
  type GridPosition,
  worldToGrid,
  GRID_CONFIG,
  type GridConfig,
} from "../../config/gameGrid";
import type GameInstance from "../../GameInstance";
import { GridTileState, type LevelGrid } from "../../types/Grid";
import isInsideGrid from "../../utils/grid/isInsideGrid";

export default abstract class AEntity {
  public gameInstance: GameInstance;
  public worldPos: WorldPosition;
  public gridPos: GridPosition;
  public isStaticObject: boolean;
  public entityId: number;

  public abstract health: number;

  constructor(gameInstance: GameInstance, worldPos: WorldPosition, entityId: number, isStaticObject?: boolean) {
    this.gameInstance = gameInstance;
    this.worldPos = worldPos;
    this.gridPos = worldToGrid(worldPos);
    this.isStaticObject = isStaticObject ?? true;
    this.entityId = entityId;
  }

  public setWorldPosition(worldPos: WorldPosition): void {
    this.worldPos = worldPos;
    this.gridPos = worldToGrid(worldPos);
  }

  public abstract update(_deltaTime: number): void;
  public abstract draw(_deltaTime: number): void;

  public abstract damage(amount: number): void;

  public adjustMovementForCollisions(
    futurePos: WorldPosition,
    levelGrid: LevelGrid | undefined,
    gridConfig: GridConfig,
  ): WorldPosition {
    const radius = gridConfig.TILE_SIZE / 3;
    const resultPos: WorldPosition = { ...futurePos };
    const worldWidth = gridConfig.TILE_SIZE * gridConfig.GRID_WIDTH;
    const worldHeight = gridConfig.TILE_SIZE * gridConfig.GRID_HEIGHT;

    if (futurePos.x - radius < 0) resultPos.x = 0 + radius;
    if (futurePos.x + radius >= worldWidth) resultPos.x = worldWidth - radius;
    if (futurePos.y - radius < 0) resultPos.y = 0 + radius;
    if (futurePos.y + radius >= worldHeight) resultPos.y = worldHeight - radius;

    if (!levelGrid) return resultPos;

    const checkPoints: { pos: GridPosition; axis: "x" | "y"; dir: 1 | -1 }[] = [
      { pos: worldToGrid({ x: futurePos.x - radius, y: futurePos.y }), axis: "x", dir: -1 }, // Left
      { pos: worldToGrid({ x: futurePos.x + radius, y: futurePos.y }), axis: "x", dir: 1 }, // Right
      { pos: worldToGrid({ x: futurePos.x, y: futurePos.y - radius }), axis: "y", dir: -1 }, // Top
      { pos: worldToGrid({ x: futurePos.x, y: futurePos.y + radius }), axis: "y", dir: 1 }, // Bottom
    ];

    for (const check of checkPoints) {
      if (!isInsideGrid(check.pos)) continue;

      const { state } = levelGrid[check.pos.x][check.pos.y];
      if (state !== GridTileState.BLOCKED) continue;

      if (check.axis === "x") {
        const blockWorldX = check.pos.x * GRID_CONFIG.TILE_SIZE + GRID_CONFIG.TILE_SIZE / 2;
        if (check.dir < 0) {
          resultPos.x = Math.max(resultPos.x, blockWorldX + GRID_CONFIG.TILE_SIZE / 2 + radius);
        } else {
          resultPos.x = Math.min(resultPos.x, blockWorldX - GRID_CONFIG.TILE_SIZE / 2 - radius);
        }
      } else {
        const blockWorldY = check.pos.y * GRID_CONFIG.TILE_SIZE + GRID_CONFIG.TILE_SIZE / 2;
        if (check.dir < 0) {
          resultPos.y = Math.max(resultPos.y, blockWorldY + GRID_CONFIG.TILE_SIZE / 2 + radius);
        } else {
          resultPos.y = Math.min(resultPos.y, blockWorldY - GRID_CONFIG.TILE_SIZE / 2 - radius);
        }
      }
    }

    return resultPos;
  }
}
