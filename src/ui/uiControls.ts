import type GameInstance from "../GameInstance";
import styles from "../styles//uiControls.module.css";
import assertNever from "../utils/assertNever";
import cx from "../utils/cx";

export interface UiControls {
  [key: string]: { draw: VoidFunction };
}

export default function getUiControls(gameInstance: GameInstance): UiControls {
  const sleepUntilNightButton = getSleepUntilNightButton(gameInstance);
  const masterVolumeToggleButton = getMasterVolumeToggleButton(gameInstance);

  const touchControlArrLeft = getTouchControlArrows(gameInstance, "left");
  const touchControlArrTop = getTouchControlArrows(gameInstance, "top");
  const touchControlArrRight = getTouchControlArrows(gameInstance, "right");
  const touchControlArrBottom = getTouchControlArrows(gameInstance, "bottom");

  return {
    sleepUntilNightButton,
    masterVolumeToggleButton,

    touchControlArrLeft,
    touchControlArrTop,
    touchControlArrRight,
    touchControlArrBottom,
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

function getTouchControlArrows(
  gameInstance: GameInstance,
  dir: "left" | "top" | "right" | "bottom",
): UiControls[string] {
  const buttonEl = document.createElement("div");
  document.body.appendChild(buttonEl);
  buttonEl.className = cx(styles.uiControl);

  let label = "";
  let charCode = ""; // TODO: Rewrite this once GameControls are being used!

  switch (dir) {
    case "left":
      label = "←";
      charCode = "KeyA";
      buttonEl.classList.add(styles.touchControlArrLeft);
      break;
    case "top":
      label = "↑";
      charCode = "KeyW";
      buttonEl.classList.add(styles.touchControlArrTop);
      break;
    case "right":
      label = "→";
      charCode = "KeyD";
      buttonEl.classList.add(styles.touchControlArrRight);
      break;
    case "bottom":
      label = "↓";
      charCode = "KeyS";
      buttonEl.classList.add(styles.touchControlArrBottom);
      break;
    default:
      assertNever(dir);
  }

  const onKeyPress = () => {
    gameInstance.MANAGERS.InputManager.onKeyDown(new KeyboardEvent("keypress", { code: charCode }));
  };

  const onKeyUp = () => {
    gameInstance.MANAGERS.InputManager.onKeyUp(new KeyboardEvent("keyup", { code: charCode }));
  };

  buttonEl.innerText = label;

  buttonEl.addEventListener("mousedown", onKeyPress);
  document.addEventListener("mouseup", onKeyUp);

  buttonEl.addEventListener("touchstart", onKeyPress);
  document.addEventListener("touchend", onKeyUp);

  return {
    draw: () => {},
  };
}
