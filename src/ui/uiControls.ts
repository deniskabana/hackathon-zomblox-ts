import type GameInstance from "../GameInstance";
import styles from "../styles//uiControls.module.css";
import cx from "../utils/cx";

export interface UiControls {
  [key: string]: { draw: VoidFunction };
}

export default function getUiControls(gameInstance: GameInstance): UiControls {
  const sleepUntilNightButton = getSleepUntilNightButton(gameInstance);
  const masterVolumeToggleButton = getMasterVolumeToggleButton(gameInstance);

  return {
    sleepUntilNightButton,
    masterVolumeToggleButton,
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
  };
}
