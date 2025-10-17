import { type GridPosition, type GridConfig, GRID_CONFIG } from "../../config/gameGrid";

export default function isInsideGrid(
  gridPos: GridPosition,
  { GRID_WIDTH, GRID_HEIGHT }: GridConfig = GRID_CONFIG,
  threshold: number = 0,
): boolean {
  return (
    gridPos.x >= threshold &&
    gridPos.x < GRID_WIDTH - threshold &&
    gridPos.y >= threshold &&
    gridPos.y < GRID_HEIGHT - threshold
  );
}
