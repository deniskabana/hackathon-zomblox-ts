import { type GridConfig } from "../../config/gameGrid";
import { GridTileState, type LevelGrid } from "../../types/Grid";

export default function generateEmptyLevelGrid(gridConfig: GridConfig): LevelGrid {
  const levelGrid: LevelGrid = [];

  for (let x = 0; x < gridConfig.GRID_WIDTH; x++) {
    const columns: LevelGrid[number] = [];
    for (let y = 0; y < gridConfig.GRID_HEIGHT; y++) {
      columns.push({ state: GridTileState.AVAILABLE, ref: null, pos: { x, y } });
    }
    levelGrid.push(columns);
  }

  return levelGrid;
}
