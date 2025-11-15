// https://stackoverflow.com/a/67219519
export default function radialLerp(A: number, B: number, w: number): number {
  const CS = (1 - w) * Math.cos(A) + w * Math.cos(B);
  const SN = (1 - w) * Math.sin(A) + w * Math.sin(B);
  return Math.atan2(SN, CS);
}

export function lerpAngle(current: number, target: number, t: number): number {
  const TWO_PI = 2 * Math.PI;

  // Calculate the shortest difference
  let diff = target - current;

  // Normalize to -π to π range
  while (diff > Math.PI) diff -= TWO_PI;
  while (diff < -Math.PI) diff += TWO_PI;

  // Lerp using the shortest path
  return current + diff * t;
}
