import AssetManager from "./game/managers/AssetManager";
import CameraManager from "./game/managers/CameraManager";
import DrawManager from "./game/managers/DrawManager";
import GameManager from "./game/managers/GameManager";
import InputManager from "./game/managers/InputManager";
import LevelManager from "./game/managers/LevelManager";
import UIManager from "./game/managers/UIManager";
import "./style.css";

export class GameInstance {
  MANAGERS: {
    AssetManager: AssetManager;
    CameraManager: CameraManager;
    DrawManager: DrawManager;
    GameManager: GameManager;
    InputManager: InputManager;
    LevelManager: LevelManager;
    UIManager: UIManager;
  };

  constructor() {
    this.MANAGERS = {
      AssetManager: new AssetManager(this),
      CameraManager: new CameraManager(this),
      DrawManager: new DrawManager(this),
      GameManager: new GameManager(this),
      InputManager: new InputManager(this),
      LevelManager: new LevelManager(this),
      UIManager: new UIManager(this),
    };
  }
}

export const gameInstance = new GameInstance();

// document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
// `;
