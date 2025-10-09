import type { WorldPosition } from "../config/gameGrid";

export default function getVectorDistance(pos1: WorldPosition, pos2: WorldPosition) {
  const dx = pos1.x - pos2.x;
  const dy = pos1.y - pos2.y;

  return Math.sqrt(dx * dx + dy * dy);
}
