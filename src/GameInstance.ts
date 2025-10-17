import AssetManager from "./managers/AssetManager";
import CameraManager from "./managers/CameraManager";
import DrawManager from "./managers/DrawManager";
import GameManager from "./managers/GameManager";
import InputManager from "./managers/InputManager";
import LevelManager from "./managers/LevelManager";
import UIManager from "./managers/UIManager";
import VFXManager from "./managers/VFXManager";
import { GameState } from "./types/GameState";

export default class GameInstance {
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
    VFXManager: VFXManager;
  };

  gameLogicInterval: number | null = null;

  constructor() {
    this.isDev = import.meta.env.NODE_ENV === "development" || !!location.hash.match("debug");
    this.canvas = document.createElement("canvas"); // Fake in constructor
    this.MANAGERS = undefined as unknown as typeof this.MANAGERS; // Fake in constructor
  }

  init() {
    this.canvas = this.createCanvas();
    this.MANAGERS = {
      AssetManager: new AssetManager(this),
      CameraManager: new CameraManager(this),
      DrawManager: new DrawManager(this, this.canvas),
      GameManager: new GameManager(this),
      InputManager: new InputManager(this),
      LevelManager: new LevelManager(this),
      UIManager: new UIManager(this),
      VFXManager: new VFXManager(this),
    };

    document.addEventListener("click", this.startGame.bind(this));
    this.loadAndPrepareGame();
  }

  private createCanvas(): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.oncontextmenu = (e) => e.preventDefault();

    document.body.appendChild(canvas);
    return canvas;
  }

  public update(_deltaTime: number): void {
    const { GameManager, CameraManager, AssetManager } = this.MANAGERS;
    if (!GameManager.isPlaying() && !AssetManager.getIsReady()) return;
    const player = this.MANAGERS.LevelManager.player;
    if (player) CameraManager.followPlayer(player.worldPos);
    this.MANAGERS.LevelManager.update(_deltaTime);
  }

  private async loadAndPrepareGame(): Promise<void> {
    this.MANAGERS.AssetManager.init();
    await this.MANAGERS.AssetManager.preloadAssets();

    this.MANAGERS.GameManager.init();
    this.MANAGERS.GameManager.stateSetReady();

    this.MANAGERS.UIManager.init();
    this.MANAGERS.UIManager.drawStartGameContainer();
  }

  private startGame(): void {
    if (this.MANAGERS.GameManager.getState() !== GameState.READY) return;
    document.removeEventListener("click", this.startGame);

    // Asset manager was initialized in loadAndPrepareGame()
    this.MANAGERS.CameraManager.init();
    this.MANAGERS.DrawManager.init();
    this.MANAGERS.InputManager.init();
    this.MANAGERS.LevelManager.init();
    this.MANAGERS.VFXManager.init();

    this.MANAGERS.DrawManager.startRenderLoop();

    this.MANAGERS.UIManager.hideStartGameContainer();
    this.MANAGERS.GameManager.stateSetPlaying();

    this.MANAGERS.AssetManager.playAudioAsset("AMusicBackground", "music");
    this.MANAGERS.AssetManager.playAudioAsset("AFXZombieAmbience", "music", 0.4);

    this.MANAGERS.LevelManager.startGame();
  }

  public stopAndQuiteGame(): void {
    this.MANAGERS.GameManager.stateSetPaused(true);
    this.destroy();
  }

  private destroy(): void {
    this.MANAGERS.AssetManager.destroy();
    this.MANAGERS.CameraManager.destroy();
    this.MANAGERS.DrawManager.destroy();
    this.MANAGERS.GameManager.destroy();
    this.MANAGERS.InputManager.destroy();
    this.MANAGERS.LevelManager.destroy();
    this.MANAGERS.UIManager.destroy();
    this.MANAGERS.VFXManager.destroy();
  }
}
