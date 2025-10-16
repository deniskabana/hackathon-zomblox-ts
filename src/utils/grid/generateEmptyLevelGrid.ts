import { type GridConfig } from "../../config/gameGrid";
import { GridTileState, type LevelGrid } from "../../types/Grid";

export default function generateEmptyLevelGrid(gridConfig: GridConfig): LevelGrid {
  const levelGrid: LevelGrid = [];

  for (let x = 0; x < gridConfig.GRID_WIDTH; x++) {
    levelGrid[x] = [];

    for (let y = 0; y < gridConfig.GRID_HEIGHT; y++) {
      levelGrid[x][y] = { state: GridTileState.AVAILABLE, ref: null, pos: { x, y } };
    }
  }

  return levelGrid;
}
