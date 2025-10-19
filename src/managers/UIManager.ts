import type GameInstance from "../GameInstance";
import styles from "../styles/UIManager.module.css";
import debugStyles from "../styles/debug.module.css";
import hudStyles from "../styles/hud.module.css";
import uiControlsStyles from "../styles/uiControls.module.css";
import getUiControls, { type UiControls } from "../ui/uiControls";
import cx from "../utils/cx";
import { AManager } from "./abstract/AManager";

export default class UIManager extends AManager {
  private startGameContainer: HTMLDivElement;
  private nightOverlay: HTMLDivElement;
  private hudContainer: HTMLDivElement;
  private hudDayCounter: HTMLDivElement;

  private uiControls: UiControls = {};

  private debugContainer: HTMLDivElement;
  private debugTextFps: HTMLDivElement;
  private debugTextZombies: HTMLDivElement;
  private debugTextHealth: HTMLDivElement;
  private debugSettingsContainer: HTMLDivElement;

  private debugSettingsInitialized: boolean = false;

  // Touch controls
  public joystickLeft: HTMLDivElement;
  public joystickRight: HTMLDivElement;

  constructor(gameInstance: GameInstance) {
    super(gameInstance);

    this.joystickLeft = document.createElement("div");
    this.joystickRight = document.createElement("div");

    document.body.appendChild(this.joystickLeft);
    document.body.appendChild(this.joystickRight);

    this.startGameContainer = document.createElement("div");
    this.nightOverlay = document.createElement("div");
    this.hudContainer = document.createElement("div");
    this.hudDayCounter = document.createElement("div");

    this.hudContainer.appendChild(this.hudDayCounter);

    document.body.appendChild(this.startGameContainer);
    document.body.appendChild(this.hudContainer);
    document.body.appendChild(this.nightOverlay);

    this.debugContainer = document.createElement("div");
    this.debugTextFps = document.createElement("div");
    this.debugTextZombies = document.createElement("div");
    this.debugTextHealth = document.createElement("div");
    this.debugSettingsContainer = document.createElement("div");

    this.debugContainer.appendChild(this.debugTextFps);
    this.debugContainer.appendChild(this.debugTextZombies);
    this.debugContainer.appendChild(this.debugTextHealth);

    document.body.appendChild(this.debugContainer);
  }

  public init(): void {
    this.startGameContainer.className = cx(styles.startGameContainer);

    this.joystickLeft.className = cx(uiControlsStyles.joystick, uiControlsStyles.joystickLeft);
    this.joystickRight.className = cx(uiControlsStyles.joystick, uiControlsStyles.joystickRight);

    this.hudContainer.className = cx(hudStyles.hudContainer);
    this.hudDayCounter.className = cx(hudStyles.hudElement);

    this.nightOverlay.className = cx(styles.nightOverlay);

    this.uiControls = getUiControls(this.gameInstance);

    if (!this.gameInstance.isDev) return;

    this.debugContainer.className = cx(debugStyles.debugContainer, debugStyles.debugElementsContainer);
    if (this.gameInstance.isDev && !this.debugSettingsInitialized) this.initDebugSettings();
  }

  public draw(fps: number): void {
    this.uiControlsDraw();
    this.drawDebug(fps);
    this.drawHud();
  }

  private drawHud(): void {
    const dayNo = this.gameInstance.MANAGERS.LevelManager.levelState?.daysCounter;
    this.hudDayCounter.innerText = `Day: ${dayNo}`;
  }

  public showNightOverlay(): void {
    this.nightOverlay.style.opacity = "0.3";
  }

  public hideNightOverlay(): void {
    this.nightOverlay.style.opacity = "0";
  }

  private initDebugSettings(): void {
    this.debugSettingsContainer.className = cx(
      debugStyles.debugContainer,
      debugStyles.debugSettings,
      styles.contentContainer,
    );
    const debugSettings = this.gameInstance.MANAGERS.GameManager.getSettings().debug;

    const wrapper = document.createElement("div");
    wrapper.className = cx(styles.contentContainer);

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
      checkboxText.className = cx(styles.uiText);
      checkboxText.innerText = setting;
      checkboxLabel.appendChild(checkboxText);

      wrapper.appendChild(checkboxLabel);
    }

    this.debugContainer.appendChild(wrapper);
    this.debugSettingsInitialized = true;
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
    this.startGameContainer.className = cx(styles.startGameContainer);
    this.startGameContainer.style.display = "flex";
    const text = document.createElement("p");
    text.className = cx(styles.startGameText);
    text.innerHTML =
      "<p>Click anywhere...</p><br /><br /><small>WASD - Move, Mouse - Aim, Tab - Cycle weapons</small><br /><br /><small>(open with #debug in URL)</small>";
    this.startGameContainer.appendChild(text);
  }

  public hideStartGameContainer(): void {
    this.startGameContainer.style.display = "none";
    this.startGameContainer.innerHTML = "";
  }

  private uiControlsDraw(): void {
    for (const control of Object.values(this.uiControls)) control.draw();
  }

  public destroy(): void {
    this.startGameContainer.remove();
    this.nightOverlay.remove();
    this.hudContainer.remove();
    this.hudDayCounter.remove();

    this.debugContainer.remove();
    this.debugTextFps.remove();
    this.debugTextZombies.remove();
    this.debugTextHealth.remove();
    this.debugSettingsContainer.remove();

    this.joystickLeft.remove();
    this.joystickRight.remove();

    for (const control of Object.values(this.uiControls)) control.destroy();
    this.uiControls = {};
  }
}
