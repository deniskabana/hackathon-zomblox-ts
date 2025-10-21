import { type WorldPosition, type GridPosition, worldToGrid, type GridConfig } from "../../config/gameGrid";
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
    includeWorldBoundaries: boolean = true,
  ): WorldPosition {
    const radius = gridConfig.TILE_SIZE / 3;
    const resultPos: WorldPosition = { ...futurePos };
    const worldWidth = gridConfig.TILE_SIZE * gridConfig.GRID_WIDTH;
    const worldHeight = gridConfig.TILE_SIZE * gridConfig.GRID_HEIGHT;

    if (includeWorldBoundaries) {
      if (futurePos.x - radius < 0) resultPos.x = 0 + radius;
      if (futurePos.x + radius >= worldWidth) resultPos.x = worldWidth - radius;
      if (futurePos.y - radius < 0) resultPos.y = 0 + radius;
      if (futurePos.y + radius >= worldHeight) resultPos.y = worldHeight - radius;
    }

    if (!levelGrid) return resultPos;

    const edgeChecks = [
      { pos: worldToGrid({ x: futurePos.x - radius, y: futurePos.y }), axis: "x" as const, dir: -1 },
      { pos: worldToGrid({ x: futurePos.x + radius, y: futurePos.y }), axis: "x" as const, dir: 1 },
      { pos: worldToGrid({ x: futurePos.x, y: futurePos.y - radius }), axis: "y" as const, dir: -1 },
      { pos: worldToGrid({ x: futurePos.x, y: futurePos.y + radius }), axis: "y" as const, dir: 1 },
    ];

    let hasEdgeCollision = false;

    for (const check of edgeChecks) {
      if (!isInsideGrid(check.pos)) continue;
      if (levelGrid[check.pos.x][check.pos.y].state !== GridTileState.BLOCKED) continue;

      hasEdgeCollision = true;
      const blockRect = {
        left: check.pos.x * gridConfig.TILE_SIZE,
        top: check.pos.y * gridConfig.TILE_SIZE,
        right: (check.pos.x + 1) * gridConfig.TILE_SIZE,
        bottom: (check.pos.y + 1) * gridConfig.TILE_SIZE,
      };

      if (check.axis === "x") {
        if (check.dir < 0) {
          resultPos.x = Math.max(resultPos.x, blockRect.right + radius);
        } else {
          resultPos.x = Math.min(resultPos.x, blockRect.left - radius);
        }
      } else {
        if (check.dir < 0) {
          resultPos.y = Math.max(resultPos.y, blockRect.bottom + radius);
        } else {
          resultPos.y = Math.min(resultPos.y, blockRect.top - radius);
        }
      }
    }

    if (!hasEdgeCollision) {
      const cornerChecks = [
        { pos: worldToGrid({ x: futurePos.x - radius, y: futurePos.y - radius }), offsetX: -1, offsetY: -1 },
        { pos: worldToGrid({ x: futurePos.x + radius, y: futurePos.y - radius }), offsetX: 1, offsetY: -1 },
        { pos: worldToGrid({ x: futurePos.x - radius, y: futurePos.y + radius }), offsetX: -1, offsetY: 1 },
        { pos: worldToGrid({ x: futurePos.x + radius, y: futurePos.y + radius }), offsetX: 1, offsetY: 1 },
      ];

      for (const check of cornerChecks) {
        if (!isInsideGrid(check.pos)) continue;
        if (levelGrid[check.pos.x][check.pos.y].state !== GridTileState.BLOCKED) continue;

        const blockRect = {
          left: check.pos.x * gridConfig.TILE_SIZE,
          top: check.pos.y * gridConfig.TILE_SIZE,
          right: (check.pos.x + 1) * gridConfig.TILE_SIZE,
          bottom: (check.pos.y + 1) * gridConfig.TILE_SIZE,
        };

        const pushX = check.offsetX < 0 ? blockRect.right + radius : blockRect.left - radius;
        const pushY = check.offsetY < 0 ? blockRect.bottom + radius : blockRect.top - radius;

        const distX = Math.abs(resultPos.x - pushX);
        const distY = Math.abs(resultPos.y - pushY);

        if (distX < distY) {
          resultPos.x = pushX;
        } else {
          resultPos.y = pushY;
        }

        break;
      }
    }

    return resultPos;
  }
}
