import type GameInstance from "../GameInstance";
import styles from "../styles/uiControls.module.css";
import cx from "../utils/cx";

export interface UiControls {
  [key: string]: { draw: VoidFunction; destroy: VoidFunction };
}

export default function getUiControls() {
  return {} satisfies UiControls;
}

export function getShootButton(gameInstance: GameInstance): UiControls[string] {
  const buttonEl = document.createElement("div");
  gameInstance.MANAGERS.UIManager.uiContainer.appendChild(buttonEl);
  buttonEl.className = cx(styles.uiControl, styles.shootButton);
  buttonEl.innerText = `💥 ${gameInstance.translation.dictionary["hud.shootBtn"]}!`;

  const handleClick = () => {
    // gameInstance.MANAGERS.InputManager.simulateControlPress(GameControls.ACTION_SHOOT);
    buttonEl.classList.add(styles.uiControlActive);
  };
  const handleRelase = () => {
    // gameInstance.MANAGERS.InputManager.simulateControlRelease(GameControls.ACTION_SHOOT);
    buttonEl.classList.remove(styles.uiControlActive);
  };

  buttonEl.addEventListener("touchstart", handleClick);
  buttonEl.addEventListener("touchmove", handleClick);
  buttonEl.addEventListener("touchend", handleRelase);
  buttonEl.addEventListener("touchcancel", handleRelase);

  return {
    draw: () => {
      buttonEl.innerText = `💥 ${gameInstance.translation.dictionary["hud.shootBtn"]}!`;
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
