import type { GridPosition, WorldPosition } from "../config/gameGrid";

export default function getVectorDistance<T extends WorldPosition | GridPosition>(pos1: T, pos2: T): number {
  const dx = pos1.x - pos2.x;
  const dy = pos1.y - pos2.y;

  return Math.sqrt(dx * dx + dy * dy);
}
