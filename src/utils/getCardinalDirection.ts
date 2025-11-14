export enum Direction {
  UP = "UP",
  DOWN = "DOWN",
  LEFT = "LEFT",
  RIGHT = "RIGHT",
}

export function getCardinalDirection(angle: number): Direction {
  const TWO_PI = 2 * Math.PI;

  const normalizedAngle = ((angle % TWO_PI) + TWO_PI) % TWO_PI;

  if (normalizedAngle >= (7 * Math.PI) / 4 || normalizedAngle < Math.PI / 4) {
    return Direction.RIGHT;
  } else if (normalizedAngle >= Math.PI / 4 && normalizedAngle < (3 * Math.PI) / 4) {
    return Direction.UP;
  } else if (normalizedAngle >= (3 * Math.PI) / 4 && normalizedAngle < (5 * Math.PI) / 4) {
    return Direction.LEFT;
  } else {
    return Direction.DOWN;
  }
}
