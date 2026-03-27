import { type GridPosition, GRID_CONFIG } from "../../config/core/grid.config";
import type { AnyEntity } from "../../entities/abstract/AEntity";
import { GridTileState, type LevelGrid } from "../../types/Grid";
import type { Vector } from "../../types/Vector";
import { clamp } from "../math/clamp";

export interface FlowFieldCell {
  weight: number;
  normalizedVector: Vector;
  enemiesOnCell: AnyEntity[];
}

export type FlowField = FlowFieldCell[][];

/**
 * Uses "Dijkstra's map" (or flow-field state map) to map every tile's distance from the player (breadth first search)
 * @link https://www.redblobgames.com/pathfinding/tower-defense/
 */
export default function generateFlowField(
  levelGrid: LevelGrid,
  enemies: Map<number, AnyEntity>,
  ...startPoints: GridPosition[]
): FlowField {
  const flowField: FlowField = [];
  for (let x = 0; x < GRID_CONFIG.GRID_WIDTH; x++) {
    flowField[x] = [];
    for (let y = 0; y < GRID_CONFIG.GRID_HEIGHT; y++) {
      flowField[x][y] = { weight: Infinity, normalizedVector: { x: 0, y: 0 }, enemiesOnCell: [] };
    }
  }

  // Breadth-first search from "startPoints"
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
        if (dx === 0 && dy === 0) continue; // Ignore self
        if (dx !== 0 && dy !== 0) continue; // Ignore diagonal neighbors

        const nx = currentVector.x + dx;
        const ny = currentVector.y + dy;
        const next: Vector = { x: nx, y: ny };

        if (!levelGrid?.[nx]?.[ny]) continue;
        if (levelGrid[nx][ny].state !== GridTileState.AVAILABLE) continue;

        if (flowField[nx][ny].weight === Infinity) {
          flowField[nx][ny].weight = currentWeight + 1;
          queue.push(next);
        }
      }
    }
  }

  for (const [_, enemy] of enemies) {
    const currentFieldCell = flowField?.[enemy._getGridPosition().x]?.[enemy._getGridPosition().y];
    if (!currentFieldCell?.weight) continue;
    currentFieldCell.enemiesOnCell.push(enemy);
    // if (currentFieldCell.weight === Infinity) continue;
    // currentFieldCell.weight = Infinity;
  }

  for (let x = 0; x < GRID_CONFIG.GRID_WIDTH; x++) {
    for (let y = 0; y < GRID_CONFIG.GRID_HEIGHT; y++) {
      if (!flowField?.[x]?.[y]) continue;

      let lowestWeight = flowField[x][y].weight;
      // let lowestWeight = Infinity;
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
        const neighbor = flowField?.[x + dx]?.[y + dy];
        if (!neighbor) continue;

        const neighborWeight = neighbor.weight;
        if (neighborWeight === Infinity) continue;
        if (neighborWeight > lowestWeight) continue;

        // Disallow corner cutting around obstacles
        if (dx !== 0 && dy !== 0) {
          const field1Weight = flowField?.[x]?.[y + dy]?.weight;
          const field2Weight = flowField?.[x + dx]?.[y]?.weight;
          if (field1Weight === Infinity || field2Weight === Infinity) continue;
        }

        directionVector = neighborVector;
        lowestWeight = neighbor.weight;
      }

      flowField[x][y].normalizedVector = directionVector;
    }
  }

  return flowField;
}
