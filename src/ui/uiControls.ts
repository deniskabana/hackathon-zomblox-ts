import type GameInstance from "../GameInstance";
import styles from "../styles//uiControls.module.css";
import cx from "../utils/cx";

export interface UiControls {
  [key: string]: { draw: VoidFunction };
}

export default function getUiControls(gameInstance: GameInstance): UiControls {
  const masterVolumeToggleButton = getMasterVolumeToggleButton(gameInstance);

  return {
    masterVolumeToggleButton,
  };
}

function getMasterVolumeToggleButton(gameInstance: GameInstance): UiControls[string] {
  const buttonEl = document.createElement("div");
  document.body.appendChild(buttonEl);
  buttonEl.className = cx(styles.uiControl, styles.masterVolumeToggleButton);

  buttonEl.onclick = () => {
    const volumeSettings = gameInstance.MANAGERS.GameManager.getSettings().volume;

    if (volumeSettings.master === 1) {
      gameInstance.MANAGERS.GameManager.setSettings({ volume: { master: 0 } });
      gameInstance.MANAGERS.AssetManager.pauseAllMusic();
    } else {
      gameInstance.MANAGERS.GameManager.setSettings({ volume: { master: 1 } });
      gameInstance.MANAGERS.AssetManager.resumeAllMusic();
    }
  };

  return {
    draw: () => {
      const volumeSettings = gameInstance.MANAGERS.GameManager.getSettings().volume;
      const label = volumeSettings.master === 0 ? "🔇" : "🔊";
      if (buttonEl.innerText !== label) buttonEl.innerText = label;
    },
  };
}
