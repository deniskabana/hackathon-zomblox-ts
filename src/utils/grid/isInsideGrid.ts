import { type GridPosition, type GridConfig, GRID_CONFIG } from "../../config/gameGrid";

export default function isInsideGrid(
  gridPos: GridPosition,
  { GRID_WIDTH, GRID_HEIGHT }: GridConfig = GRID_CONFIG,
): boolean {
  return gridPos.x >= 0 && gridPos.x < GRID_WIDTH && gridPos.y >= 0 && gridPos.y < GRID_HEIGHT;
}
