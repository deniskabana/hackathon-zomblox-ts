import type { WorldPosition } from "../config/gameGrid";

export default function radiansToVector(rad: number): WorldPosition {
  return { x: Math.cos(rad), y: Math.sin(rad) };
}
