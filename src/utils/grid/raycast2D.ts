import { GRID_CONFIG, worldToGrid, type WorldPosition } from "../../config/gameGrid";
import { GridTileState, type GridTileRef, type LevelGrid } from "../../types/Grid";
import getVectorDistance from "../getVectorDistance";
import radiansToVector from "../radiansToVector";
import isInsideGrid from "./isInsideGrid";

const MAX_RANGE = 100;

export default function raycast2D(
  from: WorldPosition,
  angleRad: number,
  maxDistance: number,
  levelGrid: LevelGrid,
): null | GridTileRef {
  // DDA Algorithm (put together from a few articles and reddit posts)
  const direction = radiansToVector(angleRad);
  const startGrid = worldToGrid({ x: from.x, y: from.y });
  const stepX = direction.x > 0 ? 1 : -1;
  const stepY = direction.y > 0 ? 1 : -1;
  const deltaDistX = Math.abs(1 / direction.x);
  const deltaDistY = Math.abs(1 / direction.y);

  let tMaxX = Math.abs((startGrid.x + (stepX > 0 ? 1 : 0) - from.x / GRID_CONFIG.TILE_SIZE) / direction.x);
  let tMaxY = Math.abs((startGrid.y + (stepY > 0 ? 1 : 0) - from.y / GRID_CONFIG.TILE_SIZE) / direction.y);

  let currentX = startGrid.x;
  let currentY = startGrid.y;
  let raycastHit: null | GridTileRef = null;

  for (let i = 0; i < MAX_RANGE; i++) {
    if (!isInsideGrid({ x: currentX, y: currentY })) break;
    const { ref, state } = levelGrid?.[currentX]?.[currentY] ?? { ref: null, state: GridTileState.AVAILABLE };
    if (state === GridTileState.BLOCKED) {
      raycastHit = ref;
      break;
    }

    // Next tile
    if (tMaxX < tMaxY) {
      tMaxX += deltaDistX;
      currentX += stepX;
    } else {
      tMaxY += deltaDistY;
      currentY += stepY;
    }
  }

  if (raycastHit && getVectorDistance(from, raycastHit.worldPos) > maxDistance) return null;
  return raycastHit;
}
