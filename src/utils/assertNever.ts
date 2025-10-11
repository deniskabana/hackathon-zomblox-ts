export default function assertNever(prop: never) {
  console.error("Assert never failed! Received prop:", prop);
  throw new Error("Assert never failed!");
}
