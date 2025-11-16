import SpriteSheet, { type SpriteFrame } from "./SpriteSheet";

export class AnimatedSpriteSheet extends SpriteSheet {
  private currentFrame: number = 0;
  private animationTimer: number = 0;
  private frameDuration: number;
  private isPlaying: boolean = true;
  private loop: boolean = true;

  public frameWidth: number;
  public frameHeight: number;

  constructor(
    image: HTMLImageElement,
    frames: SpriteFrame[],
    fps: number = 10,
    loop: boolean = true,
    frameWidth: number,
    frameHeight: number,
  ) {
    super(image, frames);
    this.frameDuration = 1 / fps;
    this.loop = loop;

    this.frameWidth = frameWidth;
    this.frameHeight = frameHeight;
  }

  public update(deltaTime: number): void {
    if (!this.isPlaying) return;

    this.animationTimer += deltaTime;

    if (this.animationTimer >= this.frameDuration) {
      this.animationTimer -= this.frameDuration;
      this.currentFrame++;

      if (this.currentFrame >= this.getFrameCount()) {
        if (this.loop) {
          this.currentFrame = 0;
        } else {
          this.currentFrame = this.getFrameCount() - 1;
          this.isPlaying = false;
        }
      }
    }
  }

  public getCurrentFrame(): number {
    return this.currentFrame;
  }

  public play(): void {
    this.isPlaying = true;
  }

  public pause(): void {
    this.isPlaying = false;
  }

  public reset(): void {
    this.currentFrame = 0;
    this.animationTimer = 0;
    this.isPlaying = true;
  }

  public setFrame(frame: number): void {
    this.currentFrame = Math.max(0, Math.min(frame, this.getFrameCount() - 1));
  }

  static fromGrid(
    image: HTMLImageElement,
    frameWidth: number,
    frameHeight: number,
    frameCount: number,
    fps: number = 10,
    loop: boolean = true,
    columns?: number,
  ): AnimatedSpriteSheet {
    const baseSheet = SpriteSheet.fromGrid(image, frameWidth, frameHeight, frameCount, columns);
    return new AnimatedSpriteSheet(image, baseSheet["frames"], fps, loop, frameWidth, frameHeight);
  }
}
