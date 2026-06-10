import type { Vector } from "../../../types/lib/Vector";

export type EntityCollisionPoints = Vector[];

/**
 * Requires either 1 or 4 relative vectors
 */
export const EntityCollisionShape = {
  GetPoint: (offset: Vector = { x: 0, y: 0 }) => [{ x: offset.x, y: offset.y }],
  GetSquare: (size: number) => [
    { x: -size / 2, y: -size / 2 }, // top left
    { x: size / 2, y: -size / 2 }, // top right
    { x: size / 2, y: size / 2 }, // bottom right
    { x: -size / 2, y: size / 2 }, // bottom left
  ],
  GetRectangle: (topLeft: Vector, topRight: Vector, bottomRight: Vector, bottomLeft: Vector) => [
    topLeft,
    topRight,
    bottomRight,
    bottomLeft,
  ],
} as const satisfies Record<string, (...args: never[]) => EntityCollisionPoints>;
