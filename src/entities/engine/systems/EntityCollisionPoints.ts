import type { Vector } from "../../../types/lib/Vector";

export type EntityCollisionPoints = Vector[];

export const EntityCollisionShape = {
  GetPoint: (offset: Vector = { x: 0, y: 0 }) => [{ x: offset.x, y: offset.y }],
  GetSquare: (size: number) => [
    { x: -size / 2, y: -size / 2 },
    { x: size / 2, y: -size / 2 },
    { x: -size / 2, y: size / 2 },
    { x: size / 2, y: size / 2 },
  ],
} as const satisfies Record<string, (...args: never[]) => EntityCollisionPoints>;
