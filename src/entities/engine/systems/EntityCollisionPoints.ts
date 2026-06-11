import type { Vector } from "../../../types/lib/Vector";

export type EntityCollisionPoints = Vector[];

export const EntityCollisionShape = {
  GetPoint: (offset: Vector = { x: 0, y: 0 }) => [{ x: offset.x, y: offset.y }],
  GetSquare: (size: number) => [
    { x: -size / 2, y: -size / 2 }, // top left
    { x: size / 2, y: -size / 2 }, // top right
    { x: size / 2, y: size / 2 }, // bottom right
    { x: -size / 2, y: size / 2 }, // bottom left
  ],
  GetRectangle: (topLeft: Vector, bottomRight: Vector) => [
    topLeft,
    { x: bottomRight.x, y: topLeft.y },
    bottomRight,
    { x: topLeft.x, y: bottomRight.y },
  ],
} as const satisfies Record<string, (...args: never[]) => EntityCollisionPoints>;
