import type GameInstance from "../GameInstance";
import styles from "../styles/uiControls.module.css";
import { GameControls } from "../types/GameControls";
import cx from "../utils/cx";

export interface UiControls {
  [key: string]: { draw: VoidFunction; destroy: VoidFunction };
}

export default function getUiControls(gameInstance: GameInstance): UiControls {
  return {
    fullScreenButton: getFullScreenButton(gameInstance),
    sleepUntilNightButton: getSleepUntilNightButton(gameInstance),
    masterVolumeToggleButton: getMasterVolumeToggleButton(gameInstance),
    buildModeButton: getBuildModeButton(gameInstance),
  };
}

function getFullScreenButton(gameInstance: GameInstance): UiControls[string] {
  const buttonEl = document.createElement("div");
  gameInstance.MANAGERS.UIManager.uiContainer.appendChild(buttonEl);
  buttonEl.className = cx(styles.uiControl, styles.fullScreenButton);
  buttonEl.innerText = "🖥️";

  const handleClick = () => {
    if (document.fullscreenElement === document.body) document.exitFullscreen();
    else document.body.requestFullscreen();
  };

  buttonEl.addEventListener("click", handleClick);
  buttonEl.addEventListener("touchend", handleClick);

  return {
    draw: () => {},
    destroy: () => {
      buttonEl.removeEventListener("click", handleClick);
      buttonEl.removeEventListener("touchend", handleClick);
      buttonEl.remove();
    },
  };
}

function getMasterVolumeToggleButton(gameInstance: GameInstance): UiControls[string] {
  const buttonEl = document.createElement("div");
  gameInstance.MANAGERS.UIManager.uiContainer.appendChild(buttonEl);
  buttonEl.className = cx(styles.uiControl, styles.masterVolumeToggleButton);

  const handleClick = () => {
    const volumeSettings = gameInstance.MANAGERS.GameManager.getSettings().volume;

    if (volumeSettings.master === 1) {
      gameInstance.MANAGERS.GameManager.setSettings({ volume: { master: 0 } });
      gameInstance.MANAGERS.AssetManager.pauseAllMusic();
    } else {
      gameInstance.MANAGERS.GameManager.setSettings({ volume: { master: 1 } });
      gameInstance.MANAGERS.AssetManager.resumeAllMusic();
    }
  };

  buttonEl.addEventListener("click", handleClick);
  buttonEl.addEventListener("touchend", handleClick);

  return {
    draw: () => {
      const volumeSettings = gameInstance.MANAGERS.GameManager.getSettings().volume;
      const label = volumeSettings.master === 0 ? "🔇" : "🔊";
      if (buttonEl.innerText !== label) buttonEl.innerText = label;
    },
    destroy: () => {
      buttonEl.removeEventListener("click", handleClick);
      buttonEl.removeEventListener("touchend", handleClick);
      buttonEl.remove();
    },
  };
}

function getSleepUntilNightButton(gameInstance: GameInstance): UiControls[string] {
  const buttonEl = document.createElement("div");
  gameInstance.MANAGERS.UIManager.uiContainer.appendChild(buttonEl);
  buttonEl.className = cx(styles.uiControl, styles.sleepUntilNightButton);
  buttonEl.innerHTML = "🌙 Sleep until night";

  const handleClick = () => {
    const isDay = gameInstance.MANAGERS.LevelManager.getIsDay();
    if (!isDay) return;
    gameInstance.MANAGERS.LevelManager.startNight();
  };

  buttonEl.addEventListener("click", handleClick);
  buttonEl.addEventListener("touchend", handleClick);

  return {
    draw: () => {
      const isDay = gameInstance.MANAGERS.LevelManager.getIsDay();
      const desiredOpacity = isDay ? "1" : "0";
      if (buttonEl.style.opacity !== desiredOpacity) buttonEl.style.opacity = desiredOpacity;
    },
    destroy: () => {
      buttonEl.removeEventListener("click", handleClick);
      buttonEl.removeEventListener("touchend", handleClick);
      buttonEl.remove();
    },
  };
}

function getBuildModeButton(gameInstance: GameInstance): UiControls[string] {
  const buttonEl = document.createElement("div");
  gameInstance.MANAGERS.UIManager.uiContainer.appendChild(buttonEl);
  buttonEl.className = cx(styles.uiControl, styles.buildModeButton);
  buttonEl.innerText = "🛠️ Build mode";

  const handleClick = () => {
    gameInstance.MANAGERS.InputManager.simulateControlPress(GameControls.BUILD_MENU);
    buttonEl.classList.add(styles.uiControlActive);
  };
  const handleRelase = () => {
    gameInstance.MANAGERS.InputManager.simulateControlRelease(GameControls.BUILD_MENU);
    buttonEl.classList.remove(styles.uiControlActive);
  };

  buttonEl.addEventListener("click", handleClick);
  buttonEl.addEventListener("touchend", handleClick);

  buttonEl.addEventListener("touchstart", handleClick);
  buttonEl.addEventListener("touchmove", handleClick);
  buttonEl.addEventListener("touchend", handleRelase);
  buttonEl.addEventListener("touchcancel", handleRelase);

  return {
    draw: () => {
      const isDay = gameInstance.MANAGERS.LevelManager.getIsDay();
      const desiredOpacity = isDay ? "1" : "0";
      if (buttonEl.style.opacity !== desiredOpacity) buttonEl.style.opacity = desiredOpacity;
    },
    destroy: () => {
      buttonEl.removeEventListener("touchstart", handleClick);
      buttonEl.removeEventListener("touchend", handleClick);
      buttonEl.removeEventListener("touchmove", handleRelase);
      buttonEl.removeEventListener("touchcancel", handleRelase);
      buttonEl.remove();
    },
  };
}
