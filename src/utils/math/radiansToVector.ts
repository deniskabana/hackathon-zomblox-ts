import type { Vector } from "../../types/Vector";

export default function radiansToVector(rad: number): Vector {
  return { x: Math.cos(rad), y: Math.sin(rad) };
}
