import type { WorldPosition } from "../config/gameGrid";

export default function getDirectionalAngle(
  pos1: WorldPosition,
  pos2: WorldPosition,
): number {
  const dx = pos1.x - pos2.x;
  const dy = pos1.y - pos2.y;

  return Math.atan2(dy, dx);
}
