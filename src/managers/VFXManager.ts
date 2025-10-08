import type { WorldPosition } from "../config/gameGrid";
import { gameInstance } from "../main";
import radiansToVector from "../utils/radiansToVector";

export interface EffectShootLine {
  from: WorldPosition;
  /** radians */
  to: WorldPosition;
  color: string;
  duration: number;
}

export default class VFXManager {
  private startTimes: number[] = [];
  private effects: EffectShootLine[] = [];

  constructor() { }

  public draw(): void {
    for (const shootLine of this.effects) {
      gameInstance.MANAGERS.DrawManager.drawLine(
        shootLine.from.x,
        shootLine.from.y,
        shootLine.to.x,
        shootLine.to.y,
        shootLine.color,
      )
    }

    const startTimes = this.startTimes;
    startTimes.forEach((since, index) => {
      if (since + this.effects[index].duration <= Date.now()) {
        this.startTimes.splice(index);
        this.effects.splice(index);
      }
    })
  }

  public drawShootLine(from: WorldPosition, direction: number, color: string = '#d0d000', duration: number = 0.2): void {
    this.startTimes.push(Date.now());
    const vectorFrom = gameInstance.MANAGERS.CameraManager.worldToScreen(from);
    const vectorTo = radiansToVector(direction);
    vectorTo.x *= 800;
    vectorTo.y *= 800;
    vectorTo.x += vectorFrom.x;
    vectorTo.y += vectorFrom.y;
    this.effects.push({ from: vectorFrom, to: vectorTo, color, duration })
  }
}
