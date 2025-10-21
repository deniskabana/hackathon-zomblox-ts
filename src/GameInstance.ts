import AssetManager from "./managers/AssetManager";
import CameraManager from "./managers/CameraManager";
import DrawManager from "./managers/DrawManager";
import GameManager from "./managers/GameManager";
import InputManager from "./managers/InputManager";
import LevelManager from "./managers/LevelManager";
import UIManager from "./managers/UIManager";
import VFXManager from "./managers/VFXManager";
import csTranslation from "./translation/cs";
import enTranslation from "./translation/en";
import { GameState } from "./types/GameState";
import type { Translation } from "./types/Translation";

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
  public translation: Translation;

  private readonly translations: Translation[] = [
    { dictionary: enTranslation, code: ["en"], flag: "🇬🇧" }, // Default is first index
    { dictionary: csTranslation, code: ["cs", "sk"], flag: "🇨🇿" },
  ];

  gameLogicInterval: number = 50; // 50 ms; TODO: Implement

  constructor() {
    this.isDev = import.meta.env.NODE_ENV === "development" || !!location.hash.match("debug");
    this.canvas = document.createElement("canvas"); // Fake in constructor
    this.MANAGERS = undefined as unknown as typeof this.MANAGERS; // Fake in constructor

    const preferredTranslation = this.translations.find(({ code }) => code.includes(navigator.language.slice(0, 2)));
    if (preferredTranslation) this.translation = preferredTranslation;
    else this.translation = this.translations[0];
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
    document.addEventListener("touchend", this.startGame.bind(this));
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
    const { LevelManager, GameManager, CameraManager, AssetManager } = this.MANAGERS;
    if (!GameManager.isPlaying() && !AssetManager.getIsReady()) return;

    const player = this.MANAGERS.LevelManager.player;
    if (player) CameraManager.followPlayer(_deltaTime, player.worldPos);

    LevelManager.update(_deltaTime);
    CameraManager.update(_deltaTime);
  }

  private async loadAndPrepareGame(): Promise<void> {
    const { UIManager, GameManager, AssetManager } = this.MANAGERS;

    AssetManager.init();
    await AssetManager.preloadAssets();

    GameManager.init();
    GameManager.stateSetReady();

    UIManager.init();
    UIManager.showStartGameContainer();
  }

  private startGame(): void {
    const { UIManager, GameManager, CameraManager, DrawManager, InputManager, LevelManager, VFXManager } =
      this.MANAGERS;
    if (this.MANAGERS.GameManager.getState() !== GameState.READY) return;

    document.removeEventListener("click", this.startGame);
    document.removeEventListener("touchend", this.startGame);

    // Fullscreen
    if (document.fullscreenElement === document.body) document.exitFullscreen();
    else document.body.requestFullscreen();

    // Asset manager was initialized in loadAndPrepareGame()
    CameraManager.init();
    DrawManager.init();
    InputManager.init();
    LevelManager.init();
    VFXManager.init();

    DrawManager.startRenderLoop();

    UIManager.hideStartGameContainer();
    UIManager.showUi();
    GameManager.stateSetPlaying();

    LevelManager.startGame();
  }

  public stopAndQuiteGame(): void {
    this.destroy();
  }

  public async restartGame(): Promise<void> {
    this.stopAndQuiteGame();
    await this.loadAndPrepareGame();
    document.addEventListener("click", this.startGame.bind(this));
    document.addEventListener("touchend", this.startGame.bind(this));
  }

  private destroy(): void {
    const { AssetManager, UIManager, GameManager, CameraManager, DrawManager, InputManager, LevelManager, VFXManager } =
      this.MANAGERS;

    AssetManager.destroy();
    CameraManager.destroy();
    DrawManager.destroy();
    GameManager.destroy();
    InputManager.destroy();
    LevelManager.destroy();
    UIManager.destroy();
    VFXManager.destroy();
  }
}
