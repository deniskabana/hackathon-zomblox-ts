import { GRID_CONFIG, type WorldPosition } from "../config/gameGrid";
import type GameInstance from "../GameInstance";
import type { Effect } from "../types/Effects";
import { ZIndex } from "../types/ZIndex";
import radiansToVector from "../utils/math/radiansToVector";
import { AManager } from "./abstract/AManager";

export default class VFXManager extends AManager {
  private effectIdCount: number = 0;
  private effects: Map<number, Effect> = new Map();

  constructor(gameInstance: GameInstance) {
    super(gameInstance);
  }

  public init(): void {}

  public draw(): void {
    for (const [id, effect] of this.effects) {
      if (effect.startTime + effect.duration * 1000 < Date.now()) {
        this.effects.delete(id);
        continue;
      }
      effect.render();
    }
  }

  public drawShootLine(
    vectorFrom: WorldPosition,
    direction: number,
    length: number = 2000,
    color: string = "#d0d000a0",
    duration: number = 0.06,
  ): void {
    const vectorTo = radiansToVector(direction);
    vectorTo.x *= length;
    vectorTo.y *= length;
    vectorTo.x += vectorFrom.x;
    vectorTo.y += vectorFrom.y;

    this.effects.set(this.effectIdCount++, {
      duration,
      render: () => {
        this.gameInstance.MANAGERS.DrawManager.drawLine(vectorFrom.x, vectorFrom.y, vectorTo.x, vectorTo.y, color);
      },
      startTime: Date.now(),
    });
  }

  public drawBloodPool(pos: WorldPosition, duration: number = 30): void {
    const alpha = Math.random() * 0.4 + 0.4;
    const sizeDeviation = 0.5 + Math.random();

    this.effects.set(this.effectIdCount++, {
      duration,
      render: () => {
        const bloodSprite = this.gameInstance.MANAGERS.AssetManager.getImageAsset("IFXBloodSplat");
        if (!bloodSprite) return;

        this.gameInstance.MANAGERS.DrawManager.queueDraw(
          pos.x,
          pos.y,
          bloodSprite,
          GRID_CONFIG.TILE_SIZE * sizeDeviation,
          GRID_CONFIG.TILE_SIZE * sizeDeviation,
          ZIndex.GROUND_EFFECTS,
          2 * Math.PI * Math.floor(Math.random()),
          alpha,
        );
      },
      startTime: Date.now(),
    });
  }

  public destroy(): void {}
}
