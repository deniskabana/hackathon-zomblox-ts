import { type GridPosition, GRID_CONFIG } from "../../config/core/grid.config";
import type { AnyEntity } from "../../entities/engine/AEntity";
import type { Vector } from "../../types/lib/Vector";
import { clamp } from "../math/clamp";
import { GridTileState } from "./generateMapBlockGrid";

export interface FlowFieldCell {
  weight: number;
  distanceWeight: number;
  normalizedVector?: Vector;
}

export type FlowField = FlowFieldCell[][];

export default function generateFlowField(
  levelGrid: GridTileState[][],
  blockGrid: (AnyEntity[] | null)[][] | undefined,
  enemyGrid: (AnyEntity[] | null)[][] | undefined,
  startPoints: GridPosition[],
): FlowField {
  const bfsGrid = breadthFirstSearch(levelGrid, blockGrid, enemyGrid, startPoints);
  const vectorGrid = getVectorField(bfsGrid);
  return vectorGrid;
}

function breadthFirstSearch(
  levelGrid: GridTileState[][],
  blockGrid: (AnyEntity[] | null)[][] | undefined,
  enemyGrid: (AnyEntity[] | null)[][] | undefined,
  startPoints: GridPosition[],
): FlowField {
  const grid: FlowField = [];
  for (let x = 0; x < GRID_CONFIG.GRID_WIDTH; x++) {
    grid[x] = [];
    for (let y = 0; y < GRID_CONFIG.GRID_HEIGHT; y++) {
      grid[x][y] = {
        normalizedVector: { x: 0, y: 0 },
        weight: Infinity,
        distanceWeight: Infinity,
      };
    }
  }

  // Single queue, seed ALL start points at distance 0
  const queue: Vector[] = [];
  for (const from of startPoints) {
    const sx = clamp(0, from.x, GRID_CONFIG.GRID_WIDTH - 1);
    const sy = clamp(0, from.y, GRID_CONFIG.GRID_HEIGHT - 1);
    const cell = grid[sx][sy];

    // guard against duplicate/overlapping seeds
    if (cell.distanceWeight !== Infinity) continue;

    cell.distanceWeight = 0;
    cell.weight = 0 + (enemyGrid?.[sx]?.[sy]?.length ?? 0);
    queue.push({ x: sx, y: sy });
  }

  let head = 0; // index cursor instead of shift()
  while (head < queue.length) {
    const currentVector = queue[head++];
    const cell = grid?.[currentVector.x]?.[currentVector.y];
    if (!cell) continue;

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        if (dx !== 0 && dy !== 0) continue; // cardinals only

        const nx = currentVector.x + dx;
        const ny = currentVector.y + dy;

        if (!levelGrid?.[nx]?.[ny]) continue;
        if (levelGrid[nx][ny] !== GridTileState.AVAILABLE) continue;
        if ((blockGrid?.[nx]?.[ny]?.length ?? 0) > 0) continue;

        // visited check on distanceWeight, not weight
        if (grid[nx][ny].distanceWeight === Infinity) {
          grid[nx][ny].distanceWeight = cell.distanceWeight + 1;
          grid[nx][ny].weight = grid[nx][ny].distanceWeight + (enemyGrid?.[nx]?.[ny]?.length ?? 0);
          queue.push({ x: nx, y: ny });
        }
      }
    }
  }

  return grid;
}

export function getVectorField(grid: FlowField): FlowField {
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
        if (neighborWeight === Infinity) continue;
        if (neighborWeight > lowestWeight) continue;

        // Disallows corner cutting around obstacles
        if (dx !== 0 && dy !== 0) {
          const field1Weight = grid?.[x]?.[y + dy]?.weight;
          const field2Weight = grid?.[x + dx]?.[y]?.weight;
          if (
            field1Weight === Infinity ||
            field2Weight === Infinity ||
            field1Weight === -Infinity ||
            field2Weight === -Infinity
          )
            continue;
        }

        directionVector = neighborVector;
        lowestWeight = neighbor.weight;
      }

      grid[x][y].normalizedVector = directionVector;
    }
  }

  return grid;
}
