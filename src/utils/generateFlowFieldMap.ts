import { GRID_CONFIG, type GridPosition } from "../config/gameGrid";
import { GridTileState, type LevelGrid } from "../types/Grid";
import type { Vector } from "../types/Vector";

export interface FlowFieldCell {
  distance: number;
  cameFrom: Vector;
  neighbors: Vector[];
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
      flowField[x][y] = { distance: Infinity, cameFrom: { x: 0, y: 0 }, neighbors: [] };
    }
  }

  // BFS from player position
  const queue: Vector[] = [from];
  flowField[from.x][from.y].distance = 0;

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentDist = flowField[current.x][current.y].distance;

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;

        const nx = current.x + dx;
        const ny = current.y + dy;
        const next: Vector = { x: nx, y: ny };

        if (!levelGrid?.[nx]?.[ny]) continue;
        if (levelGrid[nx][ny].state !== GridTileState.AVAILABLE) continue;

        // WARN: Keep neighbors calculation here instead of in Zombie class due to "limitless" zombies
        flowField[current.x][current.y].neighbors.push(next);

        if (flowField[nx][ny].distance === Infinity) {
          if (dx !== 0 && dy !== 0) continue;

          flowField[nx][ny].distance = currentDist + 1;
          flowField[nx][ny].cameFrom = { x: current.x, y: current.y };
          queue.push(next);
        }
      }
    }
  }

  return flowField;
}
