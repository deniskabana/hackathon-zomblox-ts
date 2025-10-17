import type GameInstance from "../GameInstance";
import styles from "../styles/UIManager.module.css";
import getUiControls, { type UiControls } from "../ui/uiControls";
import { AManager } from "./abstract/AManager";

// Do not waste time on this manager
export default class UIManager extends AManager {
  private fpsContainer: HTMLDivElement;
  private fpsText: HTMLParagraphElement;

  private startGameContainer: HTMLDivElement;

  private debugContainer: HTMLDivElement;
  private debugTextTracks: HTMLDivElement;
  private debugTextZombies: HTMLDivElement;
  private debugTextHealth: HTMLDivElement;

  private debugSettingsContainer: HTMLDivElement;

  private nightOverlay: HTMLDivElement;

  private uiControls: UiControls;

  constructor(gameInstance: GameInstance) {
    super(gameInstance);

    this.uiControls = getUiControls(this.gameInstance);

    this.startGameContainer = document.createElement("div");

    this.fpsContainer = document.createElement("div");
    this.fpsText = document.createElement("p");

    this.debugContainer = document.createElement("div");
    this.debugTextTracks = document.createElement("div");
    this.debugTextZombies = document.createElement("div");
    this.debugTextHealth = document.createElement("div");

    this.debugSettingsContainer = document.createElement("div");

    this.nightOverlay = document.createElement("div");
  }

  public init(): void {
    this.startGameContainer.className = styles.startGameContainer;
    document.body.appendChild(this.startGameContainer);

    this.nightOverlay.className = styles.nightOverlay;
    document.body.appendChild(this.nightOverlay);

    if (!this.gameInstance.isDev) return;
    this.fpsContainer.className = styles.devUiContainer + " " + styles.contentContainer;
    this.fpsText.className = styles.uiText;
    this.fpsContainer.appendChild(this.fpsText);
    document.body.appendChild(this.fpsContainer);

    this.debugContainer.className = styles.devUiContainer + " " + styles.devDebugContainer;
    this.debugContainer.appendChild(this.debugTextTracks);
    this.debugContainer.appendChild(this.debugTextZombies);
    this.debugContainer.appendChild(this.debugTextHealth);
    document.body.appendChild(this.debugContainer);

    if (this.gameInstance.isDev) this.initCheckbox();
  }

  public draw(fps: number): void {
    this.uiControlsDraw();

    this.drawFps(fps);
    this.drawDebug();
  }

  public showNightOverlay(): void {
    this.nightOverlay.style.opacity = "0.4";
  }

  public hideNightOverlay(): void {
    this.nightOverlay.style.opacity = "0";
  }

  private initCheckbox(): void {
    this.debugSettingsContainer.className =
      styles.devUiContainer + " " + styles.flagsContainer + " " + styles.contentContainer;
    const debugSettings = this.gameInstance.MANAGERS.GameManager.getSettings().debug;

    const checkboxLabel = document.createElement("label");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = debugSettings.enableFlowFieldRender;
    checkbox.addEventListener("change", (event) => {
      const target = event.target as HTMLInputElement;
      this.gameInstance.MANAGERS.GameManager.setSettings({
        debug: { enableFlowFieldRender: target.checked },
      });
    });
    checkboxLabel.appendChild(checkbox);

    const checkboxText = document.createElement("span");
    checkboxText.className = styles.uiText;
    checkboxText.innerText = "Debug flow field";
    checkboxLabel.appendChild(checkboxText);

    this.debugSettingsContainer.appendChild(checkboxLabel);
    document.body.appendChild(this.debugSettingsContainer);
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

    const health = this.gameInstance.MANAGERS.LevelManager.player?.health ?? 1;
    this.debugTextHealth.innerHTML = `
<div class="${styles.contentContainer}">
  <div class="${styles.uiText}">${health} / ${health}</div>
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

  private uiControlsDraw(): void {
    for (const control of Object.values(this.uiControls)) control.draw();
  }

  public destroy(): void {
    this.fpsContainer.remove();
    this.fpsText.remove();
    this.startGameContainer.remove();
    this.debugContainer.remove();
    this.debugTextTracks.remove();
    this.debugTextZombies.remove();
    this.debugTextHealth.remove();
    this.debugSettingsContainer.remove();
  }
}
