import { type GridPosition, GRID_CONFIG } from "../../config/core/grid.config";
import type { AnyEntity } from "../../entities/engine/AEntity";
import type { Vector } from "../../types/lib/Vector";
import { clamp } from "../math/clamp";
import { GridTileState } from "./generateMapBlockGrid";

export interface FlowFieldCell {
  weight: number;
  distanceWeight: number;
  enemyWeight: number;
  normalizedVector: Vector;
}

export type FlowField = FlowFieldCell[][];

export default function generateFlowField(
  levelGrid: GridTileState[][],
  enemyGrid: (AnyEntity[] | null)[][] | undefined,
  blockGrid: (AnyEntity[] | null)[][] | undefined,
  ...startPoints: GridPosition[]
): FlowField {
  const grid: FlowField = [];
  for (let x = 0; x < GRID_CONFIG.GRID_WIDTH; x++) {
    grid[x] = [];
    for (let y = 0; y < GRID_CONFIG.GRID_HEIGHT; y++) {
      grid[x][y] = {
        normalizedVector: { x: 0, y: 0 },
        weight: Infinity,
        distanceWeight: Infinity,
        enemyWeight: 0,
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
    cell.distanceWeight = 0;
    cell.enemyWeight = 0;
  }

  const weightedEnemies = new Set<AnyEntity>();

  while (queue.length > 0) {
    const currentVector = queue.shift()!;
    const cell = grid?.[currentVector.x]?.[currentVector.y];
    if (!cell) continue;

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue; // Ignore self

        const nx = currentVector.x + dx;
        const ny = currentVector.y + dy;
        if (dx !== 0 && dy !== 0) continue;

        if (!levelGrid?.[nx]?.[ny]) continue;
        if (levelGrid?.[nx]?.[ny] !== GridTileState.AVAILABLE) continue;
        if ((blockGrid?.[nx]?.[ny]?.length ?? 0) > 0) continue;

        if (grid[nx][ny].weight === Infinity) {
          grid[nx][ny].distanceWeight = cell.distanceWeight + 1;
          grid[nx][ny].weight = grid[nx][ny].distanceWeight;

          // Enemy weighting
          const enemies = enemyGrid?.[nx]?.[ny] ?? [];
          for (const enemy of enemies) {
            if (weightedEnemies.has(enemy)) continue;
            weightedEnemies.add(enemy);
            for (const gridPos of enemy._getSpanningGridTiles()) {
              if (grid?.[gridPos.x]?.[gridPos.y]) grid[gridPos.x][gridPos.y].weight += 1;
            }
          }

          queue.push({ x: nx, y: ny });
        }
      }
    }
  }

  // Calculate normalized vectors based on distances
  for (let x = 0; x < GRID_CONFIG.GRID_WIDTH; x++) {
    for (let y = 0; y < GRID_CONFIG.GRID_HEIGHT; y++) {
      if (!grid?.[x]?.[y]) continue;

      let lowestWeight = Infinity;
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
        if (neighborWeight === Infinity || neighborWeight > lowestWeight) continue;

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
