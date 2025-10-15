import type { WorldPosition } from "../config/gameGrid";
import type GameInstance from "../GameInstance";
import radiansToVector from "../utils/radiansToVector";

export interface EffectShootLine {
  from: WorldPosition;
  /** radians */
  to: WorldPosition;
  color: string;
  duration: number;
}

export default class VFXManager {
  private gameInstance: GameInstance;
  private startTimes: number[] = [];
  private effects: EffectShootLine[] = [];

  constructor(gameInstance: GameInstance) {
    this.gameInstance = gameInstance;
  }

  public draw(): void {
    for (const shootLine of this.effects) {
      this.gameInstance.MANAGERS.DrawManager.drawLine(
        shootLine.from.x,
        shootLine.from.y,
        shootLine.to.x,
        shootLine.to.y,
        shootLine.color,
      );
    }

    const startTimes = this.startTimes;
    startTimes.forEach((since, index) => {
      if (since + this.effects[index].duration <= Date.now()) {
        this.startTimes.splice(index);
        this.effects.splice(index);
      }
    });
  }

  public drawShootLine(
    vectorFrom: WorldPosition,
    direction: number,
    length: number = 2000,
    color: string = "#d0d000",
    duration: number = 0.33, // BUG: This does not work! It only draws to a single frame and gets overwritten the next
  ): void {
    this.startTimes.push(Date.now());
    const vectorTo = radiansToVector(direction);
    vectorTo.x *= length;
    vectorTo.y *= length;
    vectorTo.x += vectorFrom.x;
    vectorTo.y += vectorFrom.y;
    this.effects.push({ from: vectorFrom, to: vectorTo, color, duration });
  }
}
