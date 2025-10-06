import AssetManager from "./managers/AssetManager";
import CameraManager from "./managers/CameraManager";
import DrawManager from "./managers/DrawManager";
import GameManager from "./managers/GameManager";
import InputManager from "./managers/InputManager";
import LevelManager from "./managers/LevelManager";
import UIManager from "./managers/UIManager";
import "./style.css";

export class GameInstance {
  public MANAGERS: {
    AssetManager: AssetManager;
    CameraManager: CameraManager;
    DrawManager: DrawManager;
    GameManager: GameManager;
    InputManager: InputManager;
    LevelManager: LevelManager;
    UIManager: UIManager;
  };
  public CANVAS: HTMLCanvasElement;

  constructor() {
    this.MANAGERS = {
      AssetManager: new AssetManager(),
      CameraManager: new CameraManager(),
      DrawManager: new DrawManager(),
      GameManager: new GameManager(),
      InputManager: new InputManager(),
      LevelManager: new LevelManager(),
      UIManager: new UIManager(),
    };
    this.CANVAS = this.createCanvas()
  }

  private createCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    return canvas;
  }
}

export const gameInstance = new GameInstance();

// document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
// `;
