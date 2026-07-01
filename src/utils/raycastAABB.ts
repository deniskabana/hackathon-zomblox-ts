import type { AABB } from "../types/lib/AABB";
import type { Vector } from "../types/lib/Vector";

export default function raycastAABB(
  origin: Vector,
  direction: Vector,
  maxDistance: number,
  hitboxes: AABB[],
): { distance: number; point: Vector } | null {
  const EPSILON = 1e-10;

  const invDx = 1 / (Math.abs(direction.x) < EPSILON ? EPSILON : direction.x);
  const invDy = 1 / (Math.abs(direction.y) < EPSILON ? EPSILON : direction.y);

  let distance: number = -Infinity;

  for (const { left, right, top, bottom } of hitboxes) {
    const tx1 = (left - origin.x) * invDx;
    const tx2 = (right - origin.x) * invDx;
    const ty1 = (top - origin.y) * invDy;
    const ty2 = (bottom - origin.y) * invDy;

    const tmin = Math.max(Math.min(tx1, tx2), Math.min(ty1, ty2));
    const tmax = Math.min(Math.max(tx1, tx2), Math.max(ty1, ty2));

    if (tmax < 0 || tmin > tmax || tmin > maxDistance) continue;

    distance = Math.max(tmin, 0); // 0 if origin is inside the box
  }

  if (distance === -Infinity) return null;

  return {
    distance,
    point: { x: origin.x + direction.x * distance, y: origin.y + direction.y * distance },
  };
}
