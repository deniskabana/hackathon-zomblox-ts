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
    const alpha = Math.random() * 0.25 + 0.65;
    const sizeDeviation = 1.1 + Math.random() * 0.8;
    const angles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
    const angle = angles[Math.floor(Math.random() * angles.length)];

    const bloodImage = this.gameInstance.MANAGERS.AssetManager.getImageAsset("SFXBloodSplat");
    if (!bloodImage) return;
    const bloodSpriteSheet = SpriteSheet.fromTileset(bloodImage, 16, 16);
    const frameIndex = Math.floor(Math.random() * bloodSpriteSheet.getFrameCount() + 0.1);

    this.effects.set(this.effectIdCount++, {
      duration,
      render: (_deltaTime) => {
        this.gameInstance.MANAGERS.DrawManager.queueDrawSprite(
          pos.x,
          pos.y,
          bloodSpriteSheet,
          frameIndex,
          GRID_CONFIG.TILE_SIZE * sizeDeviation,
          GRID_CONFIG.TILE_SIZE * sizeDeviation,
          ZIndex.GROUND_EFFECTS,
          angle,
          alpha - alpha * _deltaTime,
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
        const bloodSprite = this.gameInstance.MANAGERS.AssetManager.getImageAsset("IFXBloodOverlay");
        if (!bloodSprite) return;

        if (alpha < 1) alpha += _deltaTime;
        else alpha = 1;

        this.gameInstance.MANAGERS.DrawManager.drawImage(
          0,
          0,
          bloodSprite,
          this.gameInstance.MANAGERS.CameraManager.viewportWidth,
          this.gameInstance.MANAGERS.CameraManager.viewportHeight,
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
