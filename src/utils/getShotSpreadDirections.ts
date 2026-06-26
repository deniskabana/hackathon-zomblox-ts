import type { Vector } from "../types/lib/Vector";

export default function getShotSpreadDirections(
  baseDirection: Vector,
  pattern: {
    pellets: number;
    spreadAngle: number; // deg
  },
): Vector[] {
  const { pellets, spreadAngle } = pattern;
  if (pellets === 1) return [baseDirection];

  const baseAngle = Math.atan2(baseDirection.y, baseDirection.x);
  const halfSpread = (spreadAngle * Math.PI) / 180 / 2;
  const step = (halfSpread * 2) / (pellets - 1);

  return Array.from({ length: pellets }, (_, i) => {
    const angle = baseAngle - halfSpread + step * i;
    return { x: Math.cos(angle), y: Math.sin(angle) };
  });
}
