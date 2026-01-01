import { type GridPosition, GRID_CONFIG } from "../../config/core/grid.config";
import type Zombie from "../../entities/enemies/Zombie";
import { GridTileState, type LevelGrid } from "../../types/Grid";
import type { Vector } from "../../types/Vector";
import { clamp } from "../math/clamp";

export interface FlowFieldCell {
  weight: number;
  normalizedVector: Vector;
}

export type FlowField = FlowFieldCell[][];

/**
 * Uses "Dijkstra's map" (or flow-field state map) to map every tile's distance from the player (breadth first search)
 * @link https://www.redblobgames.com/pathfinding/tower-defense/
 */
export default function generateFlowField(
  levelGrid: LevelGrid,
  enemies: Map<number, Zombie>,
  ...startPoints: GridPosition[]
): FlowField {
  const flowField: FlowField = [];
  for (let x = 0; x < GRID_CONFIG.GRID_WIDTH; x++) {
    flowField[x] = [];
    for (let y = 0; y < GRID_CONFIG.GRID_HEIGHT; y++) {
      flowField[x][y] = { weight: Infinity, normalizedVector: { x: 0, y: 0 } };
    }
  }

  // Breadth-first search from "startPoints" (representing zombie active interest location)
  const queue: Vector[] = [];
  for (const from of startPoints) {
    queue.push(from);
    flowField[clamp(0, from.x, GRID_CONFIG.GRID_WIDTH - 1)][clamp(0, from.y, GRID_CONFIG.GRID_HEIGHT - 1)].weight = 0;
  }

  while (queue.length > 0) {
    const currentVector = queue.shift()!;
    const currentWeight = flowField[currentVector.x][currentVector.y].weight;

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;

        const nx = currentVector.x + dx;
        const ny = currentVector.y + dy;
        const next: Vector = { x: nx, y: ny };

        if (!levelGrid?.[nx]?.[ny]) continue;
        if (levelGrid[nx][ny].state !== GridTileState.AVAILABLE) continue;

        if (dx !== 0 && dy !== 0) continue; // Force only 4-way scanning

        if (flowField[nx][ny].weight === Infinity) {
          flowField[nx][ny].weight = currentWeight + 1;
          queue.push(next);
        }
      }
    }
  }

  for (const [_, enemy] of enemies) {
    if (!flowField?.[enemy.gridPos.x]?.[enemy.gridPos.y]?.weight) continue;
    flowField[enemy.gridPos.x][enemy.gridPos.y].weight += 1;
  }

  for (let x = 0; x < GRID_CONFIG.GRID_WIDTH; x++) {
    for (let y = 0; y < GRID_CONFIG.GRID_HEIGHT; y++) {
      if (!flowField?.[x]?.[y]) continue;
      if (flowField[x][y].weight === Infinity) continue;

      let lowestWeight = flowField[x][y].weight;
      let directionVector = { x: 0, y: 0 };

      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          if (!flowField?.[x + dx]?.[y + dy]) continue;

          const neighborWeight = flowField[x + dx][y + dy].weight;
          if (neighborWeight === Infinity) continue;

          if (neighborWeight < lowestWeight) {
            directionVector = { x: dx, y: dy };
            lowestWeight = neighborWeight;
          }
        }
      }

      flowField[x][y].normalizedVector = directionVector;
    }
  }

  return flowField;
}
