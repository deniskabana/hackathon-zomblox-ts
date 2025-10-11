import { GRID_CONFIG, type GridPosition } from "../config/gameGrid";
import { GridTileState, type GridTile, type LevelGrid } from "../types/Grid";
import type { Vector } from "../types/Vector";

/**
 * Uses "Dijkstra's map" (or flow-field state map) to map every tile's distance from the player
 * @link https://www.redblobgames.com/pathfinding/tower-defense/
 */
export default function generateFlowField(levelGrid: LevelGrid, from: GridPosition): FlowFieldDistanceMap {
  const startPos: GridTile = levelGrid[from.x][from.y];
  const queue: GridTile[] = [startPos];
  const distanceMap: FlowFieldDistanceMap = { [vectorToVectorId(from)]: 0 };

  while (queue.length > 0) {
    const currentTile = queue.shift()
    if (!currentTile) throw new Error('Grid pathfinding critical error.');
    const currentId = vectorToVectorId(currentTile.pos)

    const neighbors = getTileNeighbors(levelGrid, currentTile.pos, distanceMap)
    for (const neighborVector of neighbors) {
      const neighborId = vectorToVectorId(neighborVector);

      if (!distanceMap[neighborId]) {
        queue.push(levelGrid[neighborVector.x][neighborVector.y]);
        distanceMap[neighborId] = distanceMap[currentId] + 1;
      }
    }
  }

  return distanceMap;
}

export type FlowFieldDistanceMap = Record<VectorId, number>

export type VectorId = `${number};${number}`

export function vectorToVectorId({ x, y }: Vector): VectorId {
  return `${x};${y}`
}
export function vectorIdToVector(id: VectorId): Vector {
  const [x, y] = id.split(';');
  return { x: Number(x), y: Number(y) };
}

export function getTileNeighbors(levelGrid: LevelGrid, { x, y }: GridPosition, distanceMap: FlowFieldDistanceMap): GridPosition[] {
  const neighbors: GridPosition[] = [];

  const saveNeighbor = (pos: Vector) => {
    if (!levelGrid[pos.x][pos.y]) return;
    if (levelGrid[pos.x][pos.y].state !== GridTileState.AVAILABLE) return;
    if (distanceMap[vectorToVectorId(pos)]) return;
    neighbors.push(pos);
  }

  // Horizontal and vertical
  if (y > 0) saveNeighbor({ x, y: y - 1 });
  if (x < GRID_CONFIG.GRID_WIDTH - 1) saveNeighbor({ x: x + 1, y });
  if (y < GRID_CONFIG.GRID_HEIGHT - 1) saveNeighbor({ x, y: y + 1 });
  if (x > 0) saveNeighbor({ x: x - 1, y });
  // Diagonal
  if (x > 0 && y > 0) saveNeighbor({ x: x - 1, y: y - 1 });
  if (x < GRID_CONFIG.GRID_WIDTH - 1 && y > 0) saveNeighbor({ x: x + 1, y: y - 1 });
  if (x > 0 && y < GRID_CONFIG.GRID_HEIGHT - 1) saveNeighbor({ x: x - 1, y: y + 1 });
  if (x < GRID_CONFIG.GRID_WIDTH - 1 && y < GRID_CONFIG.GRID_HEIGHT - 1) saveNeighbor({ x: x + 1, y: y + 1 });

  return neighbors;
}
