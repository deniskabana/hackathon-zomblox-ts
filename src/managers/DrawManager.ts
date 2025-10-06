import { gameInstance } from "../main";

export default class DrawManager {
  canvas: HTMLCanvasElement;

  constructor() {
    this.canvas = gameInstance.CANVAS;
    document.addEventListener('resize', this.updateCanvasSize);
  }

  private updateCanvasSize() {
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
  }
}
