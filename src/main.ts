import AssetManager from "./managers/AssetManager";
import CameraManager from "./managers/CameraManager";
import DrawManager from "./managers/DrawManager";
import GameManager from "./managers/GameManager";
import InputManager from "./managers/InputManager";
import LevelManager from "./managers/LevelManager";
import UIManager from "./managers/UIManager";
import "./style.css";

export class GameInstance {
  public isDev: boolean;
  public canvas: HTMLCanvasElement;
  public MANAGERS: {
    AssetManager: AssetManager;
    CameraManager: CameraManager;
    DrawManager: DrawManager;
    GameManager: GameManager;
    InputManager: InputManager;
    LevelManager: LevelManager;
    UIManager: UIManager;
  };

  constructor() {
    this.isDev = import.meta.env.NODE_ENV === 'development' || !!location.hash.match('debug')
    this.canvas = this.createCanvas()
    this.MANAGERS = {
      AssetManager: new AssetManager(),
      CameraManager: new CameraManager(),
      DrawManager: new DrawManager(this.canvas),
      GameManager: new GameManager(),
      InputManager: new InputManager(),
      LevelManager: new LevelManager(),
      UIManager: new UIManager(),
    };

    this.loadAndStartGame();
  }

  private createCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    return canvas;
  }

  public update(deltaTime: number): void {
    const { GameManager, CameraManager, AssetManager } = this.MANAGERS;
    if (!GameManager.isPlaying() && !AssetManager.getIsReady()) return;
    CameraManager.followPlayer({ x: 0, y: 0 });

    // TODO: Perform actions on other managers and remove rectangle, haha
    // this.MANAGERS.DrawManager.drawRectOutline(100, 100, 200, 50, '#bada55', 2);

    this.MANAGERS.LevelManager.drawEntities(deltaTime);
  }

  private async loadAndStartGame(): Promise<void> {
    await this.MANAGERS.AssetManager.preloadAssets();
    this.MANAGERS.GameManager.stateSetReady();
    this.MANAGERS.DrawManager.startRenderLoop();
    this.MANAGERS.UIManager.init();
  }
}

export const gameInstance = new GameInstance();
