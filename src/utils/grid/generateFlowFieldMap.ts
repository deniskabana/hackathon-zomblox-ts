import { type GridPosition, GRID_CONFIG } from "../../config/core/grid.config";
import type Zombie from "../../entities/game/enemies/Zombie";
import { type LevelGrid, GridTileState } from "../../types/engine/Grid";
import type { Vector } from "../../types/lib/Vector";
import { clamp } from "../math/clamp";

export interface FlowFieldCell {
  weight: number;
  normalizedVector: Vector;
}

export type FlowField = FlowFieldCell[][];

export default function generateFlowField(
  levelGrid: LevelGrid,
  enemyGrid: (Zombie[] | null)[][] | undefined,
  ...startPoints: GridPosition[]
): FlowField {
  const grid: FlowField = [];
  for (let x = 0; x < GRID_CONFIG.GRID_WIDTH; x++) {
    grid[x] = [];
    for (let y = 0; y < GRID_CONFIG.GRID_HEIGHT; y++) {
      grid[x][y] = {
        normalizedVector: { x: 0, y: 0 },
        weight: Infinity,
      };
    }
  }

  // Breadth-first search from "startPoints"
  // Creates a weighted distance map in integers
  const queue: Vector[] = [];
  for (const from of startPoints) {
    queue.push(from);
    const cell = grid[clamp(0, from.x, GRID_CONFIG.GRID_WIDTH - 1)][clamp(0, from.y, GRID_CONFIG.GRID_HEIGHT - 1)];
    cell.weight = 0;
  }

  while (queue.length > 0) {
    const currentVector = queue.shift()!;
    let currentWeight = grid?.[currentVector.x]?.[currentVector.y]?.weight;

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue; // Ignore self
        if (dx !== 0 && dy !== 0) continue; // Ignore diagonal neighbors

        const nx = currentVector.x + dx;
        const ny = currentVector.y + dy;
        const next: Vector = { x: nx, y: ny };

        if (!levelGrid?.[nx]?.[ny]) continue;
        if (levelGrid?.[nx]?.[ny]?.state !== GridTileState.AVAILABLE) continue;
        if (enemyGrid?.[nx]?.[ny]?.length) currentWeight++;

        if (grid[nx][ny].weight === Infinity) {
          grid[nx][ny].weight = currentWeight + 1;
          queue.push(next);
        }
      }
    }
  }

  // Calculate normalized vectors based on distances
  for (let x = 0; x < GRID_CONFIG.GRID_WIDTH; x++) {
    for (let y = 0; y < GRID_CONFIG.GRID_HEIGHT; y++) {
      if (!grid?.[x]?.[y]) continue;

      let lowestWeight = grid[x][y].weight;
      let directionVector = { x: 0, y: 0 };

      const sortedNeighborVectors: Vector[] = [
        // Diagonals
        { x: -1, y: -1 },
        { x: -1, y: 1 },
        { x: 1, y: 1 },
        { x: 1, y: -1 },
        // Cardinals
        { x: 0, y: -1 },
        { x: 0, y: 1 },
        { x: 1, y: 0 },
        { x: -1, y: 0 },
      ];

      for (const neighborVector of sortedNeighborVectors) {
        const { x: dx, y: dy } = neighborVector;
        const neighbor = grid?.[x + dx]?.[y + dy];
        if (!neighbor) continue;

        const neighborWeight = neighbor.weight;
        if (neighborWeight === Infinity) continue;
        if (neighborWeight > lowestWeight) continue;

        // Disallows corner cutting around obstacles
        if (dx !== 0 && dy !== 0) {
          const field1Weight = grid?.[x]?.[y + dy]?.weight;
          const field2Weight = grid?.[x + dx]?.[y]?.weight;
          if (field1Weight === Infinity || field2Weight === Infinity) continue;
        }

        directionVector = neighborVector;
        lowestWeight = neighbor.weight;
      }

      grid[x][y].normalizedVector = directionVector;
    }
  }

  return grid;
}
