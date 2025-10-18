import type GameInstance from "../GameInstance";
import styles from "../styles/UIManager.module.css";
import getUiControls, { type UiControls } from "../ui/uiControls";
import { AManager } from "./abstract/AManager";

// Do not waste time on this manager
export default class UIManager extends AManager {
  private startGameContainer: HTMLDivElement;
  private nightOverlay: HTMLDivElement;

  private uiControls: UiControls;

  private debugContainer: HTMLDivElement;
  private debugTextFps: HTMLDivElement;
  private debugTextZombies: HTMLDivElement;
  private debugTextHealth: HTMLDivElement;
  private debugSettingsContainer: HTMLDivElement;

  constructor(gameInstance: GameInstance) {
    super(gameInstance);

    this.uiControls = getUiControls(this.gameInstance);
    this.startGameContainer = document.createElement("div");
    this.nightOverlay = document.createElement("div");

    this.debugContainer = document.createElement("div");
    this.debugTextFps = document.createElement("div");
    this.debugTextZombies = document.createElement("div");
    this.debugTextHealth = document.createElement("div");
    this.debugSettingsContainer = document.createElement("div");
  }

  public init(): void {
    this.startGameContainer.className = styles.startGameContainer;
    document.body.appendChild(this.startGameContainer);

    this.nightOverlay.className = styles.nightOverlay;
    document.body.appendChild(this.nightOverlay);

    if (!this.gameInstance.isDev) return;

    this.debugContainer.className = styles.devUiContainer + " " + styles.devDebugContainer;
    if (this.gameInstance.isDev) this.initDebugSettings();
    this.debugContainer.appendChild(this.debugTextFps);
    this.debugContainer.appendChild(this.debugTextZombies);
    this.debugContainer.appendChild(this.debugTextHealth);
    document.body.appendChild(this.debugContainer);
  }

  public draw(fps: number): void {
    this.uiControlsDraw();
    this.drawDebug(fps);
  }

  public showNightOverlay(): void {
    this.nightOverlay.style.opacity = "0.3";
  }

  public hideNightOverlay(): void {
    this.nightOverlay.style.opacity = "0";
  }

  private initDebugSettings(): void {
    this.debugSettingsContainer.className =
      styles.devUiContainer + " " + styles.flagsContainer + " " + styles.contentContainer;
    const debugSettings = this.gameInstance.MANAGERS.GameManager.getSettings().debug;

    const wrapper = document.createElement("div");
    wrapper.className = styles.contentContainer;

    let setting: keyof typeof debugSettings;
    for (setting in debugSettings) {
      const checkboxLabel = document.createElement("label");

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = debugSettings[setting];
      checkbox.name = setting;
      checkbox.addEventListener("change", (event) => {
        const target = event.target as HTMLInputElement;
        this.gameInstance.MANAGERS.GameManager.setSettings({
          debug: { [target.name]: target.checked },
        });
      });
      checkboxLabel.appendChild(checkbox);

      const checkboxText = document.createElement("span");
      checkboxText.className = styles.uiText;
      checkboxText.innerText = setting;
      checkboxLabel.appendChild(checkboxText);

      wrapper.appendChild(checkboxLabel);
    }

    this.debugContainer.appendChild(wrapper);
  }

  public drawDebug(fps: number): void {
    if (!this.gameInstance.isDev) return;

    this.debugTextFps.innerHTML = `
<div class="${styles.contentContainer}">
  <div class="${styles.uiTitle}">FPS:</div>
  <div class="${styles.uiText}">${fps}</div>
</div>
    `;

    const zombiesAmount = this.gameInstance.MANAGERS.LevelManager.zombies.size;
    this.debugTextZombies.innerHTML = `
<div class="${styles.contentContainer}">
  <div class="${styles.uiTitle}">Zombies:</div>
  <div class="${styles.uiText}">${zombiesAmount}</div>
</div>
`;

    const health = this.gameInstance.MANAGERS.LevelManager.player?.health ?? 1;
    this.debugTextHealth.innerHTML = `
<div class="${styles.contentContainer}">
  <div class="${styles.uiTitle}">Health:</div>
  <div class="${styles.uiText}">${health} / ${health}</div>
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
    this.startGameContainer.remove();
    this.debugContainer.remove();
    this.debugTextFps.remove();
    this.debugTextZombies.remove();
    this.debugTextHealth.remove();
    this.debugSettingsContainer.remove();
    this.nightOverlay.remove();
  }
}
