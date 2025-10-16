export interface DrawCommand {
  image: HTMLImageElement;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  alpha?: number;
  zIndex: number;
}
