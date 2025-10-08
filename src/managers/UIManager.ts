import { gameInstance } from "../main";

export default class UIManager {
  private fpsContainer: HTMLDivElement;
  private fpsText: HTMLParagraphElement;

  private startGameContainer: HTMLDivElement;

  constructor() {
    this.fpsContainer = document.createElement("div");
    this.fpsText = document.createElement("p");
    this.fpsContainer.appendChild(this.fpsText);

    this.startGameContainer = document.createElement('div');
    document.body.appendChild(this.startGameContainer);
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

  public drawStartGameContainer(): void {
    this.startGameContainer.style = `position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: #2a2a2ab8; z-index: 10; display: flex; place-items: center;`
    const text = document.createElement('p');
    text.style = `display: block; text-align: center; font-weight: bold; width: 100%; font-size: 30px;`
    text.innerText = "Click anywhere...";
    this.startGameContainer.appendChild(text);
  }

  public hideStartGameContainer(): void {
    this.startGameContainer.style = `display: none;`
    this.startGameContainer.innerHTML = '';
  }
}
