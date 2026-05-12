import { GRID_CONFIG, type WorldPosition } from "../../config/core/grid.config";
import DrawManager from "../../managers/core/DrawManager";
import type { AssetImage } from "../../types/Asset";
import { ZIndex } from "../../types/ZIndex";
import { AnimatedSpriteSheet } from "../../utils/classes/AnimatedSpriteSheet";

export type AnimationID = string;

export type AnimationSliceSpec = {
  id: AnimationID;
  /** Represents what `activeVariant` picks */
  assetVariants: AssetImage[];
  frameCount: number;
  /** @default true */
  loop?: boolean;
  // Overrides
  fps?: number;
  frameWidth?: number;
  frameHeight?: number;
  alpha?: number;
  offset?: { x: number; y: number };
  scale?: number;
  rotation?: number;
};

/** Interface that defines the inputs for entity animation system. */
export interface EntityAnimationsSpecs {
  frameWidth: number;
  frameHeight: number;
  /** @default 0 */
  activeVariant?: number;
  /** @default `animations[0].id` */
  active?: AnimationID[];
  /** Indexed by `AnimationID` */
  animations: AnimationSliceSpec[];
  fps: number;
}

export class EntityAnimations {
  private frameWidth: number;
  private frameHeight: number;
  private activeVariant: number;
  private active: AnimationID[];
  private animations: AnimationSliceSpec[];
  private fps: number;

  private spriteSheets: Record<AnimationID, AnimatedSpriteSheet[]>;

  constructor(props: EntityAnimationsSpecs) {
    this.frameWidth = props.frameWidth;
    this.frameHeight = props.frameHeight;
    this.activeVariant = props.activeVariant ?? 0;
    this.active = props.active ?? [props.animations[0].id];
    this.animations = props.animations;
    this.fps = props.fps;

    const spriteSheets: typeof this.spriteSheets = {};

    for (const animation of this.animations) {
      spriteSheets[animation.id] = animation.assetVariants.map((asset) =>
        AnimatedSpriteSheet.fromGrid(
          asset,
          animation.frameWidth ?? this.frameWidth,
          animation.frameHeight ?? this.frameHeight,
          animation.frameCount,
          animation.fps ?? this.fps,
        ),
      );
    }

    this.spriteSheets = spriteSheets;
  }

  public tick(_deltaTime: number): void {
    for (const animationId of this.active) {
      const sheets = this.spriteSheets[animationId];
      if (!sheets) continue;
      for (const sheet of sheets) sheet.update(_deltaTime);
    }
  }

  public drawActiveAnimations(
    worldPos: WorldPosition,
    size: number = GRID_CONFIG.TILE_SIZE,
    drawManager: DrawManager,
  ): void {
    for (const animationId of this.active) {
      const currentAnimation = this.animations.find(({ id }) => id === animationId);
      if (!currentAnimation) continue;

      const spritesheet = this.spriteSheets[currentAnimation.id][this.activeVariant];

      drawManager.queueDrawSprite(
        worldPos.x + (currentAnimation.offset?.x ?? 0) - size / 2,
        worldPos.y + (currentAnimation.offset?.y ?? 0) - size / 2,
        spritesheet,
        spritesheet.getCurrentFrame(),
        size,
        size,
        ZIndex.ENTITIES,
        currentAnimation.rotation ?? 0,
        currentAnimation.alpha ?? 1,
        currentAnimation.scale ?? 1,
      );
    }
  }

  public setActiveAnimations(active: AnimationID[]): void {
    this.active = active;
  }

  public toggleActiveAnimation(id: AnimationID, value: boolean): void {
    const idIndex = this.active.findIndex((activeId) => activeId === id);

    if (value) {
      if (idIndex > -1) return;
      this.active.push(id);
    } else {
      if (idIndex === -1) return;
      this.active.splice(idIndex, 1);
    }
  }

  public getActiveAnimations(): AnimationID[] {
    return [...this.active];
  }
  public getActiveVariant(): number {
    return this.activeVariant;
  }
  public setActiveVariant(variant: number): void {
    this.activeVariant = variant;
  }
}
