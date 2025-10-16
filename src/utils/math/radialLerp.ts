// https://stackoverflow.com/a/67219519
export default function radialLerp(A: number, B: number, w: number): number {
  const CS = (1 - w) * Math.cos(A) + w * Math.cos(B);
  const SN = (1 - w) * Math.sin(A) + w * Math.sin(B);
  return Math.atan2(SN, CS);
}
