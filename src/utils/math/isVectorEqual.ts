import type { Vector } from "../../types/Vector";

export default function areVectorsEqual(firstVector: Vector, ...vectors: (Vector | undefined)[]): boolean {
  if (!vectors.length) return false;
  const { x, y } = firstVector;
  for (const vector of vectors) if (x !== vector?.x || y !== vector?.y) return false;
  return true;
}
