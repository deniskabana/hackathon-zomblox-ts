import type { WorldPosition } from "../config/gameGrid";

export interface Effect {
  duration: number;
  render: VoidFunction;
  startTime: number;
}

export interface EffectShootLine extends Effect {
  from: WorldPosition;
  to: WorldPosition;
  color: string;
}

export interface EffectBloodPool extends Effect {
  pos: WorldPosition;
}
