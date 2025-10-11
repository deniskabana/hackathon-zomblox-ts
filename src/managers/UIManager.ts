import { GRID_CONFIG } from "../config/gameGrid";
import { gameInstance } from "../main";

const styles = {
  startGameContainer: `
position: fixed;
top: 0;
left: 0;
right: 0;
bottom: 0;
background: #2a2a2ab8;
z-index: 10;
display: flex;
place-items: center;
  `,
  startGameText: `
display: block;
text-align: center;
font-weight: bold;
width: 100%;
font-size: 21px;
  `,
  devUiContainer: `
position: fixed;
z-index: 2;
padding: 0;
right: 8px;
top: 8px;
  `,
  uiText: `
color: black;
font-size: 11px;
line-height: 1.2;
margin: 0;
font-weight: 600;
  `,
  uiTitle: `
display: block;
color: black;
font-size: 12px;
margin: 0;
font-weight: bolder;
border-top: 1px solid #6a6a6a;
margin-top: 3px;
  `,
  contentContainer: `
background: white;
opacity: 0.5;
border-radius: 4px;
box-shadow: 0 0 12px rgba(0,0,0,0.8);
padding: 3px 6px;
  `,
  devDebugContainer: `
right: 8px;
bottom: 8px;
left: auto;
top: auto;
display: flex;
align-items: flex-end;
flex-direction: row-reverse;
gap: 10px;
pointer-events: none;
  `,
};

export default class UIManager {
  private fpsContainer: HTMLDivElement;
  private fpsText: HTMLParagraphElement;

  private startGameContainer: HTMLDivElement;

  private debugContainer: HTMLDivElement;
  private debugTextTracks: HTMLDivElement;
  private debugTextZombies: HTMLDivElement;
  private debugTextHealth: HTMLDivElement;

  constructor() {
    this.startGameContainer = document.createElement("div");
    document.body.appendChild(this.startGameContainer);

    this.fpsContainer = document.createElement("div");
    this.fpsText = document.createElement("p");
    this.fpsContainer.appendChild(this.fpsText);
    document.body.appendChild(this.fpsContainer);

    this.debugContainer = document.createElement("div");
    this.debugTextTracks = document.createElement("div");
    this.debugTextZombies = document.createElement("div");
    this.debugTextHealth = document.createElement("div");
    this.debugContainer.appendChild(this.debugTextTracks);
    this.debugContainer.appendChild(this.debugTextZombies);
    this.debugContainer.appendChild(this.debugTextHealth);
    document.body.appendChild(this.debugContainer);
  }

  public init(): void {
    this.styleFps();
    this.styleDebugContainer();
  }

  private styleFps(): void {
    if (!gameInstance.isDev) return;
    this.fpsContainer.style = styles.devUiContainer + styles.contentContainer;
    this.fpsText.style = styles.uiText;
  }

  private styleDebugContainer(): void {
    if (!gameInstance.isDev) return;
    this.debugContainer.style = styles.devUiContainer + styles.devDebugContainer;
  }

  public drawFps(fps: number): void {
    if (!gameInstance.isDev) return;
    this.fpsText.innerText = `${fps} FPS`;
  }

  public drawDebug(): void {
    if (!gameInstance.isDev) return;

    const playingTracks = [...gameInstance.MANAGERS.AssetManager.playingAudioTracks];
    this.debugTextTracks.innerHTML = `
<div style="${styles.contentContainer}">
  ${playingTracks.map((track) => `<div style="${styles.uiText}">${track}</div>`).join("")}
  <div style="${styles.uiTitle}">Tracks playing:</div>
</div>
    `;

    const zombiesAmount = gameInstance.MANAGERS.LevelManager.zombies.size;
    this.debugTextZombies.innerHTML = `
<div style="${styles.contentContainer}">
  <div style="${styles.uiText}">${zombiesAmount}</div>
  <div style="${styles.uiTitle}">Zombies:</div>
</div>
`;

    const health = gameInstance.MANAGERS.LevelManager.player.health;
    this.debugTextHealth.innerHTML = `
<div style="${styles.contentContainer}">
  <div style="${styles.uiText}">${(100 / health) * 100}%</div>
  <div style="${styles.uiTitle}">Health:</div>
</div>
`;
  }

  public drawStartGameContainer(): void {
    this.startGameContainer.style = styles.startGameContainer;
    const text = document.createElement("p");
    text.style = styles.startGameText;
    text.innerHTML =
      "<p>Click anywhere...</p><br /><br /><small>WASD - Move, Mouse - Aim, Tab - Cycle weapons</small><br /><br /><small>(open with #debug in URL)</small>";
    this.startGameContainer.appendChild(text);
  }

  public hideStartGameContainer(): void {
    this.startGameContainer.style = `display: none;`;
    this.startGameContainer.innerHTML = "";
  }
}
