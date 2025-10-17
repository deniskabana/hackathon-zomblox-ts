import type { Vector } from "../../types/Vector";

export default function combineVectors<T extends Vector>(...vectors: T[]): T {
  return vectors.reduce((acc, val) => {
    acc.x += val.x;
    acc.y += val.y;
    return acc;
  }, vectors[0]);
}
