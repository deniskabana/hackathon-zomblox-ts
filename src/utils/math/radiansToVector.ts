import type { Vector } from "../../types/lib/Vector";

export default function radiansToVector(rad: number): Vector {
  return { x: Math.cos(rad), y: Math.sin(rad) };
}
