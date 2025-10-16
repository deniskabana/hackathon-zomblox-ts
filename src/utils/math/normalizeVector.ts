import type { Vector } from "../../types/Vector";

export default function normalizeVector<T extends Vector>(vector: T): T {
  let x = vector.x;
  let y = vector.y;

  if (x !== 0 && y !== 0) {
    const length = Math.sqrt(x * x + y * y);
    x /= length;
    y /= length;
  }

  return { ...vector, x, y };
}
