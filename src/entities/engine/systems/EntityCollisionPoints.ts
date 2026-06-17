import type { Vector } from "../../../types/lib/Vector";

export type EntityCollisionPoints = Vector[];

export const EntityCollisionShape = {
  GetPoint: (offset: Vector = { x: 0, y: 0 }) => [{ x: offset.x, y: offset.y }],
  GetSquare: (offsetX: number, offsetY: number, size: number) => [
    { x: offsetX, y: offsetY }, // top left
    { x: offsetX + size, y: offsetY }, // top right
    { x: offsetX + size, y: offsetY + size }, // bottom right
    { x: offsetX, y: offsetY + size }, // bottom left
  ],
  GetRectangle: (topLeft: Vector, bottomRight: Vector) => [
    topLeft,
    { x: bottomRight.x, y: topLeft.y },
    bottomRight,
    { x: topLeft.x, y: bottomRight.y },
  ],
} as const satisfies Record<string, (...args: never[]) => EntityCollisionPoints>;
