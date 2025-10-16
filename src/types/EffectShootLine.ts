import type { WorldPosition } from "../config/gameGrid";

export interface EffectShootLine {
  from: WorldPosition;
  to: WorldPosition;
  color: string;
  duration: number;
}
