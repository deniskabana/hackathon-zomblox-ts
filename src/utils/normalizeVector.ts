export default function normalizeVector(vector: { x: number; y: number }): {
  x: number;
  y: number;
} {
  let x = vector.x;
  let y = vector.y;

  if (x !== 0 && y !== 0) {
    const length = Math.sqrt(x * x + y * y);
    x /= length;
    y /= length;
  }

  return { x, y };
}
