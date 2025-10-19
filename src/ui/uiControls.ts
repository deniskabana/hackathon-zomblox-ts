import type GameInstance from "../GameInstance";
import styles from "../styles/uiControls.module.css";
import { GameControls } from "../types/GameControls";
import cx from "../utils/cx";

export interface UiControls {
  [key: string]: { draw: VoidFunction; destroy: VoidFunction };
}

export default function getUiControls(gameInstance: GameInstance): UiControls {
  const sleepUntilNightButton = getSleepUntilNightButton(gameInstance);
  const masterVolumeToggleButton = getMasterVolumeToggleButton(gameInstance);
  const shootButtonLeft = getShootButton("left", gameInstance);
  const shootButtonRight = getShootButton("right", gameInstance);

  return {
    sleepUntilNightButton,
    masterVolumeToggleButton,
    shootButtonLeft,
    shootButtonRight,
  };
}

function getMasterVolumeToggleButton(gameInstance: GameInstance): UiControls[string] {
  const buttonEl = document.createElement("div");
  document.body.appendChild(buttonEl);
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
  document.body.appendChild(buttonEl);
  buttonEl.className = cx(styles.uiControl, styles.sleepUntilNightButton);
  buttonEl.innerHTML = "🛏️";

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
      buttonEl.style.opacity = isDay ? "1" : "0";
    },
    destroy: () => {
      buttonEl.removeEventListener("click", handleClick);
      buttonEl.removeEventListener("touchend", handleClick);
      buttonEl.remove();
    },
  };
}

function getShootButton(position: "right" | "left", gameInstance: GameInstance): UiControls[string] {
  const buttonEl = document.createElement("div");
  document.body.appendChild(buttonEl);
  buttonEl.className = cx(styles.uiControl, position === "left" ? styles.shootButtonLeft : styles.shootButtonRight);
  buttonEl.innerHTML = "💥";

  const handleClick = () => {
    gameInstance.MANAGERS.InputManager.simulateControlPress(GameControls.SHOOT);
    buttonEl.classList.add(styles.uiControlActive);
  };
  const handleRelase = () => {
    gameInstance.MANAGERS.InputManager.simulateControlRelease(GameControls.SHOOT);
    buttonEl.classList.remove(styles.uiControlActive);
  };

  buttonEl.addEventListener("touchstart", handleClick);
  buttonEl.addEventListener("touchmove", handleClick);
  buttonEl.addEventListener("touchend", handleRelase);
  buttonEl.addEventListener("touchcancel", handleRelase);

  return {
    draw: () => {},
    destroy: () => {
      buttonEl.removeEventListener("touchstart", handleClick);
      buttonEl.removeEventListener("touchend", handleClick);
      buttonEl.removeEventListener("touchmove", handleRelase);
      buttonEl.removeEventListener("touchcancel", handleRelase);
      buttonEl.remove();
    },
  };
}
