import type { WorldPosition, GridPosition } from "../config/gameGrid";

export default function normalizeVector<T extends WorldPosition | GridPosition>(vector: T): T {
  let x = vector.x;
  let y = vector.y;

  if (x !== 0 && y !== 0) {
    const length = Math.sqrt(x * x + y * y);
    x /= length;
    y /= length;
  }

  return { ...vector, x, y };
}
