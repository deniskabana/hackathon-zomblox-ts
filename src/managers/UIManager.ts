import { gameInstance } from "../main";

export default class UIManager {
  private fpsContainer: HTMLDivElement;
  private fpsText: HTMLParagraphElement;

  constructor() {
    this.fpsContainer = document.createElement("div");
    this.fpsText = document.createElement("p");
    this.fpsContainer.appendChild(this.fpsText);
  }

  public init(): void {
    this.styleFps();
  }

  private styleFps(): void {
    if (!gameInstance.isDev) return;
    this.fpsContainer.style = `position: fixed; right: 8px; top: 8px; background: white; opacity: 0.5; z-index: 2; padding: 0 4px;`;
    this.fpsText.style = `color: black; font-size: 11px; font-weight: bold; line-height: 1;`;
    document.body.appendChild(this.fpsContainer);
  }

  public drawFps(fps: number): void {
    if (!gameInstance.isDev) return;
    this.fpsText.innerText = `${fps} FPS`;
  }
}
