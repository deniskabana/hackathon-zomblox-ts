import AssetManager from "./managers/AssetManager";
import BuildModeManager from "./managers/BuildModeManager";
import CameraManager from "./managers/CameraManager";
import DrawManager from "./managers/DrawManager";
import GameManager from "./managers/GameManager";
import InputManager from "./managers/InputManager";
import LevelManager from "./managers/LevelManager";
import LightManager from "./managers/LightManager";
import UIManager from "./managers/UIManager";
import VFXManager from "./managers/VFXManager";
import csTranslation from "./translation/cs";
import enTranslation from "./translation/en";
import { GameState } from "./types/GameState";
import type { Translation } from "./types/Translation";

export default class GameInstance {
  public readonly isDev: boolean;
  public readonly canvas: HTMLCanvasElement;
  public readonly MANAGERS: {
    AssetManager: AssetManager;
    BuildModeManager: BuildModeManager;
    CameraManager: CameraManager;
    DrawManager: DrawManager;
    GameManager: GameManager;
    InputManager: InputManager;
    LevelManager: LevelManager;
    LightManager: LightManager;
    UIManager: UIManager;
    VFXManager: VFXManager;
  };
  public translation: Translation;

  private readonly translations: Translation[] = [
    { dictionary: enTranslation, code: ["en"], flag: "🇬🇧" }, // Default is first index
    { dictionary: csTranslation, code: ["cs", "sk"], flag: "🇨🇿" },
  ];

  constructor() {
    this.isDev = import.meta.env.NODE_ENV === "development" || !!location.hash.match("debug");
    this.canvas = this.createCanvas();

    this.MANAGERS = {
      AssetManager: new AssetManager(this),
      BuildModeManager: new BuildModeManager(this),
      CameraManager: new CameraManager(this),
      DrawManager: new DrawManager(this, this.canvas),
      GameManager: new GameManager(this),
      InputManager: new InputManager(this),
      LevelManager: new LevelManager(this),
      LightManager: new LightManager(this),
      UIManager: new UIManager(this),
      VFXManager: new VFXManager(this),
    };

    const preferredTranslation = this.translations.find(({ code }) => code.includes(navigator.language.slice(0, 2)));
    if (preferredTranslation) this.translation = preferredTranslation;
    else this.translation = this.translations[0];
  }

  init() {
    document.addEventListener("click", this.startGame);
    document.addEventListener("touchend", this.startGame);
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

  private startGame = (): void => {
    const {
      BuildModeManager,
      UIManager,
      GameManager,
      CameraManager,
      DrawManager,
      InputManager,
      LevelManager,
      LightManager,
      VFXManager,
    } = this.MANAGERS;
    if (this.MANAGERS.GameManager.getState() !== GameState.READY) return;

    document.removeEventListener("click", this.startGame);
    document.removeEventListener("touchend", this.startGame);

    if (!this.isDev) {
      // Fullscreen
      if (document.fullscreenElement === document.body) document.exitFullscreen();
      else document.body.requestFullscreen();
    }

    // Asset manager was initialized in loadAndPrepareGame()
    BuildModeManager.init();
    CameraManager.init();
    DrawManager.init();
    InputManager.init();
    LevelManager.init();
    LightManager.init();
    VFXManager.init();

    DrawManager.startRenderLoop();

    UIManager.hideStartGameContainer();
    UIManager.showUi();
    GameManager.stateSetPlaying();

    LevelManager.startGame();
  };

  public stopAndQuitGame(): void {
    this.destroy();
  }

  public async restartGame(): Promise<void> {
    document.addEventListener("click", this.startGame);
    document.addEventListener("touchend", this.startGame);
    this.stopAndQuitGame();
    await this.loadAndPrepareGame();
  }

  private destroy(): void {
    const {
      BuildModeManager,
      AssetManager,
      UIManager,
      GameManager,
      CameraManager,
      DrawManager,
      InputManager,
      LevelManager,
      LightManager,
      VFXManager,
    } = this.MANAGERS;

    AssetManager.destroy();
    BuildModeManager.destroy();
    CameraManager.destroy();
    DrawManager.destroy();
    GameManager.destroy();
    InputManager.destroy();
    LevelManager.destroy();
    LightManager.destroy();
    UIManager.destroy();
    VFXManager.destroy();
  }
}
