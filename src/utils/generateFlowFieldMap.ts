import { GRID_CONFIG, type GridPosition } from "../config/gameGrid";
import { GridTileState, type LevelGrid } from "../types/Grid";
import type { Vector } from "../types/Vector";

export interface FlowFieldCell {
  distance: number;
  directionX: number;
  directionY: number;
}

export type FlowField = FlowFieldCell[][];

/**
 * Uses "Dijkstra's map" (or flow-field state map) to map every tile's distance from the player (breadth first search)
 * @link https://www.redblobgames.com/pathfinding/tower-defense/
 */
export default function generateFlowField(levelGrid: LevelGrid, from: GridPosition): FlowField {
  const flowField: FlowField = [];
  for (let x = 0; x < GRID_CONFIG.GRID_WIDTH; x++) {
    flowField[x] = [];
    for (let y = 0; y < GRID_CONFIG.GRID_HEIGHT; y++) {
      flowField[x][y] = { distance: Infinity, directionX: 0, directionY: 0 };
    }
  }

  // BFS from player position
  const queue: Vector[] = [from];
  flowField[from.x][from.y].distance = 0;

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentDist = flowField[current.x][current.y].distance;

    // Check 8 neighbors
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;

        const nx = current.x + dx;
        const ny = current.y + dy;

        if (!levelGrid?.[nx]?.[ny]) continue;
        if (levelGrid[nx][ny].state !== GridTileState.AVAILABLE) continue;

        // If not visited yet
        if (flowField[nx][ny].distance === Infinity) {
          flowField[nx][ny].distance = currentDist + 1;
          queue.push({ x: nx, y: ny });
        }
      }
    }
  }

  // Precalculating movement vectors
  for (let x = 0; x < GRID_CONFIG.GRID_WIDTH; x++) {
    for (let y = 0; y < GRID_CONFIG.GRID_HEIGHT; y++) {
      let bestDist = flowField[x][y].distance;
      let bestDx = 0;
      let bestDy = 0;

      // Check neighbors for lowest distance
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;

          const nx = x + dx;
          const ny = y + dy;

          if (!levelGrid?.[nx]?.[ny]) continue;

          if (flowField[nx][ny].distance < bestDist) {
            bestDist = flowField[nx][ny].distance;
            bestDx = dx;
            bestDy = dy;
          }
        }
      }

      flowField[x][y].directionX = bestDx;
      flowField[x][y].directionY = bestDy;
    }
  }

  return flowField;
}
