export interface SpriteFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default class SpriteSheet {
  private image: HTMLImageElement;
  private frames: SpriteFrame[];

  constructor(image: HTMLImageElement, frames: SpriteFrame[]) {
    this.image = image;
    this.frames = frames;
  }

  public getFrame(index: number): { image: HTMLImageElement; frame: SpriteFrame } {
    return {
      image: this.image,
      frame: this.frames[index % this.frames.length],
    };
  }

  public getFrameCount(): number {
    return this.frames.length;
  }

  // Static utils
  // ==================================================

  static fromGrid(
    image: HTMLImageElement,
    frameWidth: number,
    frameHeight: number,
    frameCount: number,
    columns?: number,
  ): SpriteSheet {
    const frames: SpriteFrame[] = [];
    const cols = columns || Math.floor(image.width / frameWidth);

    for (let i = 0; i < frameCount; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);

      frames.push({
        x: col * frameWidth,
        y: row * frameHeight,
        width: frameWidth,
        height: frameHeight,
      });
    }

    return new SpriteSheet(image, frames);
  }

  static fromTileset(image: HTMLImageElement, tileWidth: number, tileHeight: number): SpriteSheet {
    const cols = Math.floor(image.width / tileWidth);
    const rows = Math.floor(image.height / tileHeight);

    return SpriteSheet.fromGrid(image, tileWidth, tileHeight, cols * rows, cols);
  }
}
