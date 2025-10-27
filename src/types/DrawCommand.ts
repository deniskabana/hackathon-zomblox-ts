import type { SpriteFrame } from "../utils/classes/SpriteSheet";

export interface DrawCommand {
  image: HTMLImageElement | HTMLCanvasElement;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  alpha?: number;
  zIndex?: number;
  sourceFrame?: SpriteFrame;
}
