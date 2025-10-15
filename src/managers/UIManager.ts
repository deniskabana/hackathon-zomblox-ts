import type GameInstance from "../GameInstance";
import styles from '../styles/UIManager.module.css'

// TODO: Refactor this into style.css and stop over-engineering shit
export default class UIManager {
  private gameInstance: GameInstance;
  private fpsContainer: HTMLDivElement;
  private fpsText: HTMLParagraphElement;

  private startGameContainer: HTMLDivElement;

  private debugContainer: HTMLDivElement;
  private debugTextTracks: HTMLDivElement;
  private debugTextZombies: HTMLDivElement;
  private debugTextHealth: HTMLDivElement;

  private flagsContainer: HTMLDivElement | undefined;

  constructor(gameInstance: GameInstance) {
    this.gameInstance = gameInstance;
    this.startGameContainer = document.createElement("div");
    this.startGameContainer.className = styles.startGameContainer;
    document.body.appendChild(this.startGameContainer);

    this.fpsContainer = document.createElement("div");
    this.fpsContainer.className = styles.devUiContainer + ' ' + styles.contentContainer;
    this.fpsText = document.createElement("p");
    this.fpsText.className = styles.uiText;
    this.fpsContainer.appendChild(this.fpsText);
    document.body.appendChild(this.fpsContainer);

    this.debugContainer = document.createElement("div");
    this.debugContainer.className = styles.devUiContainer + ' ' + styles.devDebugContainer;
    this.debugTextTracks = document.createElement("div");
    this.debugTextZombies = document.createElement("div");
    this.debugTextHealth = document.createElement("div");
    this.debugContainer.appendChild(this.debugTextTracks);
    this.debugContainer.appendChild(this.debugTextZombies);
    this.debugContainer.appendChild(this.debugTextHealth);
    document.body.appendChild(this.debugContainer);

    this.initCheckbox();
  }

  private initCheckbox(): void {
    this.flagsContainer = document.createElement('div');
    this.flagsContainer.className = styles.devUiContainer + ' ' + styles.flagsContainer + ' ' + styles.contentContainer;

    const checkboxLabel = document.createElement('label');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.addEventListener('change', (event) => {
      const target = event.target as HTMLInputElement;
      this.gameInstance.MANAGERS.GameManager.setSettings({
        debug: { enableFlowFieldRender: target.checked }
      })
    })
    checkboxLabel.appendChild(checkbox);

    const checkboxText = document.createElement('span')
    checkboxText.className = styles.uiText;
    checkboxText.innerText = "Debug flow field"
    checkboxLabel.appendChild(checkboxText);

    this.flagsContainer.appendChild(checkboxLabel)
    document.body.appendChild(this.flagsContainer);
  }

  public drawFps(fps: number): void {
    if (!this.gameInstance.isDev) return;
    this.fpsText.innerText = `${fps} FPS`;
  }

  public drawDebug(): void {
    if (!this.gameInstance.isDev) return;

    const playingTracks = [...this.gameInstance.MANAGERS.AssetManager.playingAudioTracks];
    this.debugTextTracks.innerHTML = `
<div class="${styles.contentContainer}">
  ${playingTracks.map((track) => `<div class="${styles.uiText}">${track}</div>`).join("")}
  <div class="${styles.uiTitle}">Tracks playing:</div>
</div>
    `;

    const zombiesAmount = this.gameInstance.MANAGERS.LevelManager.zombies.size;
    this.debugTextZombies.innerHTML = `
<div class="${styles.contentContainer}">
  <div class="${styles.uiText}">${zombiesAmount}</div>
  <div class="${styles.uiTitle}">Zombies:</div>
</div>
`;

    const health = this.gameInstance.MANAGERS.LevelManager.player.health;
    this.debugTextHealth.innerHTML = `
<div class="${styles.contentContainer}">
  <div class="${styles.uiText}">${(100 / health) * 100}%</div>
  <div class="${styles.uiTitle}">Health:</div>
</div>
`;
  }

  public drawStartGameContainer(): void {
    this.startGameContainer.className = styles.startGameContainer;
    const text = document.createElement("p");
    text.className = styles.startGameText;
    text.innerHTML =
      "<p>Click anywhere...</p><br /><br /><small>WASD - Move, Mouse - Aim, Tab - Cycle weapons</small><br /><br /><small>(open with #debug in URL)</small>";
    this.startGameContainer.appendChild(text);
  }

  public hideStartGameContainer(): void {
    this.startGameContainer.style = `display: none;`;
    this.startGameContainer.innerHTML = "";
  }
}
