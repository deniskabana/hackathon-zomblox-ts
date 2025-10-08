import { gameInstance } from "../main";

export default function assertNever(prop: never) {
  console.error("Assert never failed! Received prop:", prop);

  if (!gameInstance.isDev) return;
  throw new Error("Assert never failed!");
}
