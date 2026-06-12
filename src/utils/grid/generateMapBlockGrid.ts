import type { GridConfig, GridPosition } from "../../config/core/grid.config";

export enum GridTileState {
  AVAILABLE = "AVAILABLE",
  BLOCKED = "BLOCKED",
  PLAYER = "PLAYER",
}

export default function getMapBlockGrid(gridConfig: GridConfig, blocks: GridPosition[]): GridTileState[][] {
  const levelGrid: GridTileState[][] = [];

  const stringifiedBlocksVectors: Set<string> = new Set();
  for (const pos of blocks) stringifiedBlocksVectors.add(gridPosToString(pos));

  for (let x = 0; x < gridConfig.GRID_WIDTH; x++) {
    levelGrid[x] = [];

    for (let y = 0; y < gridConfig.GRID_HEIGHT; y++) {
      levelGrid[x][y] = GridTileState.AVAILABLE;

      if (stringifiedBlocksVectors.has(gridPosToString({ x, y }))) {
        levelGrid[x][y] = GridTileState.BLOCKED;
      }
    }
  }

  return levelGrid;
}

function gridPosToString(pos: GridPosition): string {
  return `${pos.x},${pos.y}`;
}
