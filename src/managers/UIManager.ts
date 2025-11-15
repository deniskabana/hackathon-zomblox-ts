import type GameInstance from "../GameInstance";
import styles from "../styles/UIManager.module.css";
import debugStyles from "../styles/debug.module.css";
import hudStyles from "../styles/hud.module.css";
import uiControlsStyles from "../styles/uiControls.module.css";
import type { LevelState } from "../types/LevelState";
import getUiControls from "../ui/uiControls";
import cx from "../utils/cx";
import { AManager } from "./abstract/AManager";

export default class UIManager extends AManager {
  public uiContainer: HTMLDivElement;

  private startGameContainer: HTMLDivElement;
  private hudContainer: HTMLDivElement;
  private hudDayCounter: HTMLDivElement;
  private hudCurrencyCounter: HTMLDivElement;

  private uiControls: ReturnType<typeof getUiControls> | undefined;

  private debugContainer: HTMLDivElement;
  private debugTextFps: HTMLDivElement;
  private debugTextZombies: HTMLDivElement;
  private debugTextHealth: HTMLDivElement;
  private debugSettingsContainer: HTMLDivElement;

  private debugSettingsInitialized: boolean = false;

  // Touch controls
  public joystickLeft: HTMLDivElement;
  public joystickRight: HTMLDivElement;
  public joystickLeftHandle: HTMLDivElement;
  public joystickRightHandle: HTMLDivElement;

  constructor(gameInstance: GameInstance) {
    super(gameInstance);

    this.uiContainer = document.createElement("div");
    this.uiContainer.id = "ui-container";
    document.body.appendChild(this.uiContainer);

    this.joystickLeft = document.createElement("div");
    this.joystickRight = document.createElement("div");
    this.joystickLeftHandle = document.createElement("div");
    this.joystickRightHandle = document.createElement("div");

    if ("ontouchend" in document) {
      this.uiContainer.appendChild(this.joystickLeft);
      this.uiContainer.appendChild(this.joystickRight);
      this.uiContainer.appendChild(this.joystickLeftHandle);
      this.uiContainer.appendChild(this.joystickRightHandle);
    }
    this.startGameContainer = document.createElement("div");
    this.hudContainer = document.createElement("div");
    this.hudDayCounter = document.createElement("div");
    this.hudCurrencyCounter = document.createElement("div");

    this.hudContainer.appendChild(this.hudDayCounter);
    this.hudContainer.appendChild(this.hudCurrencyCounter);

    document.body.appendChild(this.startGameContainer);
    this.uiContainer.appendChild(this.hudContainer);

    this.debugContainer = document.createElement("div");
    this.debugTextFps = document.createElement("div");
    this.debugTextZombies = document.createElement("div");
    this.debugTextHealth = document.createElement("div");
    this.debugSettingsContainer = document.createElement("div");

    this.debugContainer.appendChild(this.debugTextFps);
    this.debugContainer.appendChild(this.debugTextZombies);
    this.debugContainer.appendChild(this.debugTextHealth);

    this.uiContainer.appendChild(this.debugContainer);
  }

  public init(): void {
    this.startGameContainer.className = cx(styles.startGameContainer);

    this.joystickLeft.className = cx(uiControlsStyles.joystick, uiControlsStyles.joystickLeft);
    this.joystickRight.className = cx(uiControlsStyles.joystick, uiControlsStyles.joystickRight);
    this.joystickLeftHandle.className = cx(uiControlsStyles.joystickHandle);
    this.joystickRightHandle.className = cx(uiControlsStyles.joystickHandle);

    this.hudContainer.className = cx(hudStyles.hudContainer);
    this.hudDayCounter.className = cx(hudStyles.hudElement);
    this.hudCurrencyCounter.className = cx(hudStyles.hudElement);

    const coinImage = this.gameInstance.MANAGERS.AssetManager.getImageAsset("ICoinSingle");
    if (coinImage) this.hudCurrencyCounter.appendChild(coinImage);
    this.hudCurrencyCounter.appendChild(document.createElement("span"));

    this.uiControls = getUiControls(this.gameInstance);
    if (!("ontouchend" in document)) this.uiControls?.shootButton.destroy();

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
    const levelState = this.gameInstance.MANAGERS.LevelManager.levelState;
    if (!levelState) return;
    const { daysCounter, currency } = levelState;
    const label = this.gameInstance.translation.dictionary["hud.day"];
    this.hudDayCounter.innerText = `${label}: ${daysCounter}`;
    const textChild = this.hudCurrencyCounter.getElementsByTagName("span")[0];
    if (textChild) textChild.innerText = `${currency}`;
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
      checkbox.addEventListener("touchend", (event) => {
        const target = event.target as HTMLInputElement;
        target.checked = !target.checked;
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

  public showStartGameContainer(): void {
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

  public showUi(): void {
    this.uiContainer.style.opacity = "1";
  }

  public hideUi(): void {
    this.uiContainer.style.opacity = "0";
  }

  private uiControlsDraw(): void {
    if (!this.uiControls) return;
    for (const control of Object.values(this.uiControls)) control.draw();
  }

  // TODO: TBD
  public showBuildModeToolbar(): void {
    throw new Error("NOT IMPLEMENTED");
  }

  // TODO: TBD
  public hideBuildModeToolbar(): void {
    throw new Error("NOT IMPLEMENTED");
  }

  public setBuildModeState(hasSelectedTile: boolean): void {
    throw new Error("NOT IMPLEMENTED" + hasSelectedTile);
  }

  public destroy(): void {
    if (this.uiControls) {
      for (const control of Object.values(this.uiControls)) control.destroy();
      this.uiControls = undefined;
    }
  }

  public showGameOverScreen(levelState: LevelState): void {
    const gameOverScreen = document.getElementById("game-over");
    if (!gameOverScreen) return;
    gameOverScreen.style.display = "flex";
    const dictionary = this.gameInstance.translation.dictionary;

    const titleArr = this.gameInstance.translation.dictionary["gameOver.funnyTitles"];
    const titleElem = document.getElementsByClassName("game-over__title");
    if (titleElem[0]) titleElem[0].innerHTML = titleArr[Math.floor(titleArr.length * Math.random())];

    const subtitleArr = this.gameInstance.translation.dictionary["gameOver.funnyQuotes"];
    const subtitleElem = document.getElementsByClassName("game-over__subtitle");
    if (subtitleElem[0])
      subtitleElem[0].innerHTML = '"' + subtitleArr[Math.floor(subtitleArr.length * Math.random())] + '"';

    const counters: (keyof LevelState)[] = ["daysCounter", "zombiesKillCounter", "currencyTotalCounter"];

    for (const counter of counters) {
      const keyElem = document.querySelector(`.game-over__stat-key[data-id="${counter}"]`);
      if (!keyElem) continue;

      switch (counter) {
        case "daysCounter":
          keyElem.innerHTML = dictionary["gameOver.survivedDays"](levelState.daysCounter);
          break;
        case "zombiesKillCounter":
          keyElem.innerHTML = dictionary["gameOver.killedZombies"](levelState.zombiesKillCounter);
          break;
        case "currencyTotalCounter":
          keyElem.innerHTML = dictionary["gameOver.madeMoney"](levelState.currencyTotalCounter);
          break;
      }
    }

    const restartButton = document.getElementsByClassName("game-over__action-btn");
    if (restartButton[0])
      restartButton[0].addEventListener("click", this.gameInstance.restartGame.bind(this.gameInstance));
    if (restartButton[0])
      restartButton[0].addEventListener("touchend", this.gameInstance.restartGame.bind(this.gameInstance));
  }
}
