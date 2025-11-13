import { type GridConfig, type GridPosition } from "../../config/gameGrid";
import { GridTileState, type LevelGrid } from "../../types/Grid";

export default function generateEmptyLevelGrid(gridConfig: GridConfig, blocks: GridPosition[]): LevelGrid {
  const levelGrid: LevelGrid = [];

  const stringifiedBlocksVectors: Set<string> = new Set();
  for (const pos of blocks) stringifiedBlocksVectors.add(gridPosToString(pos));

  for (let x = 0; x < gridConfig.GRID_WIDTH; x++) {
    levelGrid[x] = [];

    for (let y = 0; y < gridConfig.GRID_HEIGHT; y++) {
      levelGrid[x][y] = { state: GridTileState.AVAILABLE, ref: null, pos: { x, y } };

      if (stringifiedBlocksVectors.has(gridPosToString({ x, y }))) {
        levelGrid[x][y].state = GridTileState.BLOCKED;
      }
    }
  }

  return levelGrid;
}

function gridPosToString(pos: GridPosition): string {
  return `${pos.x},${pos.y}`;
}
