import { GRID_CONFIG, type WorldPosition } from "../config/gameGrid";
import type GameInstance from "../GameInstance";
import type { Effect } from "../types/Effects";
import { ZIndex } from "../types/ZIndex";
import SpriteSheet from "../utils/classes/SpriteSheet";
import radiansToVector from "../utils/math/radiansToVector";
import { AManager } from "./abstract/AManager";

export default class VFXManager extends AManager {
  private effectIdCount: number = 0;
  private effects: Map<number, Effect> = new Map();

  constructor(gameInstance: GameInstance) {
    super(gameInstance);
  }

  public init(): void {}

  public draw(_deltaTime: number): void {
    for (const [id, effect] of this.effects) {
      if (effect.startTime + effect.duration * 1000 < Date.now()) {
        this.effects.delete(id);
        continue;
      }
      effect.render(_deltaTime);
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

  public drawBloodPool(pos: WorldPosition, duration: number = 300): void {
    const alpha = Math.random() * 0.3 + 0.7;
    const sizeDeviation = 0.8 + Math.random() * 0.3;
    const angle = 2 * Math.PI * Math.random();

    const bloodImage = this.gameInstance.MANAGERS.AssetManager.getImageAsset("SFXBloodSplat");
    if (!bloodImage) return;

    const bloodSpriteSheet = SpriteSheet.fromTileset(bloodImage, 128, 128);

    const frameIndex = Math.floor(Math.random() * bloodSpriteSheet.getFrameCount() + 0.1);

    this.effects.set(this.effectIdCount++, {
      duration,
      render: () => {
        this.gameInstance.MANAGERS.DrawManager.queueDraw(
          pos.x,
          pos.y,
          bloodSpriteSheet.getFrame(frameIndex).image,
          GRID_CONFIG.TILE_SIZE * sizeDeviation,
          GRID_CONFIG.TILE_SIZE * sizeDeviation,
          ZIndex.GROUND_EFFECTS,
          angle,
          alpha,
        );
      },
      startTime: Date.now(),
    });
  }

  public drawBloodOnScreen(duration: number = 10): void {
    let alpha = 0;

    this.effects.set(this.effectIdCount++, {
      duration,
      render: (_deltaTime) => {
        const bloodSprite = this.gameInstance.MANAGERS.AssetManager.getImageAsset("IFXBloodScreen");
        if (!bloodSprite) return;

        if (alpha < 1) alpha += _deltaTime;
        else alpha = 1;

        this.gameInstance.MANAGERS.DrawManager.queueDraw(
          0,
          0,
          bloodSprite,
          this.gameInstance.MANAGERS.CameraManager.viewportWidth,
          this.gameInstance.MANAGERS.CameraManager.viewportHeight,
          ZIndex.EFFECTS,
          0,
          alpha,
        );
      },
      startTime: Date.now(),
    });
  }

  public destroy(): void {
    this.effects.clear();
  }
}
