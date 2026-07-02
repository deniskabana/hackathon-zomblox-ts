import { type GridPosition, GRID_CONFIG } from "../../config/core/grid.config";
import type { AnyEntity } from "../../entities/engine/AEntity";
import type { Vector } from "../../types/lib/Vector";
import { clamp } from "../math/clamp";
import { GridTileState } from "./generateMapBlockGrid";

export interface FlowFieldCell {
  weight: number;
  distanceWeight: number;
  normalizedVector: Vector;
}

export type FlowField = FlowFieldCell[][];

export default function generateFlowField(
  levelGrid: GridTileState[][],
  blockGrid: (AnyEntity[] | null)[][] | undefined,
  enemyGrid: (AnyEntity[] | null)[][] | undefined,
  startPoints: GridPosition[],
  options?: { model?: "chase" | "flee" },
): FlowField {
  const bfsGrid = breadthFirstSearch(levelGrid, blockGrid, enemyGrid, startPoints);
  const vectorGrid = getVectorField(bfsGrid, options?.model ?? "chase");
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

  // Breadth-first search from "startPoints"
  // Creates a weighted distance map in integers
  const queue: Vector[] = [];
  for (const from of startPoints) {
    queue.push(from);
    const cell = grid[clamp(0, from.x, GRID_CONFIG.GRID_WIDTH - 1)][clamp(0, from.y, GRID_CONFIG.GRID_HEIGHT - 1)];
    cell.weight = 0;
    cell.distanceWeight = 0;
  }

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

          grid[nx][ny].weight += enemyGrid?.[nx]?.[ny]?.length ?? 0;

          queue.push({ x: nx, y: ny });
        }
      }
    }
  }

  return grid;
}

function getVectorField(grid: FlowField, model: "chase" | "flee"): FlowField {
  // Calculate normalized vectors based on distances
  for (let x = 0; x < GRID_CONFIG.GRID_WIDTH; x++) {
    for (let y = 0; y < GRID_CONFIG.GRID_HEIGHT; y++) {
      if (!grid?.[x]?.[y]) continue;

      let lowestWeight = Infinity;
      let highestWeight = -Infinity;
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

        if (model === "chase" && neighborWeight > lowestWeight) continue;
        if (model === "flee" && neighborWeight < highestWeight) continue;

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
        highestWeight = neighbor.weight;
      }

      grid[x][y].normalizedVector = directionVector;
    }
  }

  return grid;
}
