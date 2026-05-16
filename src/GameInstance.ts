import BuildModeManager from "./managers/BuildModeManager";
import AssetManager from "./managers/core/AssetManager";
import CameraManager from "./managers/core/CameraManager";
import DrawManager from "./managers/core/DrawManager";
import GameManager from "./managers/core/GameManager";
import { InputManager } from "./managers/core/InputManager";
import { SettingsManager } from "./managers/core/SettingsManager";
import { EntityManager } from "./managers/engine/EntityManager";
import LevelManager from "./managers/LevelManager";
import LightManager from "./managers/LightManager";
import UIManager from "./managers/UIManager";
import VFXManager from "./managers/VFXManager";
import csTranslation from "./translation/cs";
import enTranslation from "./translation/en";
import { GameState } from "./types/engine/GameState";
import type { Translation } from "./types/engine/Translation";
import { GameControls } from "./types/GameControls";
import { DebugPanel } from "./utils/classes/DebugPanel";

export default class GameInstance {
  private _debugPanel: DebugPanel | undefined;

  public readonly isDev: boolean;
  public readonly canvas: HTMLCanvasElement;
  public readonly MANAGERS: {
    AssetManager: AssetManager;
    BuildModeManager: BuildModeManager;
    CameraManager: CameraManager;
    DrawManager: DrawManager;
    EntityManager: EntityManager;
    GameManager: GameManager;
    InputManager: InputManager;
    LevelManager: LevelManager;
    LightManager: LightManager;
    SettingsManager: SettingsManager;
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

    const preferredTranslation = this.translations.find(({ code }) =>
      code.includes(localStorage.getItem("language") ?? ""),
    );
    if (preferredTranslation) this.translation = preferredTranslation;
    else this.translation = this.translations[0];

    this.MANAGERS = {
      AssetManager: new AssetManager(this),
      BuildModeManager: new BuildModeManager(this),
      CameraManager: new CameraManager(this),
      DrawManager: new DrawManager(this, this.canvas),
      EntityManager: new EntityManager(this),
      GameManager: new GameManager(this),
      InputManager: new InputManager(this),
      LevelManager: new LevelManager(this),
      LightManager: new LightManager(this),
      SettingsManager: new SettingsManager(this),
      UIManager: new UIManager(this),
      VFXManager: new VFXManager(this),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (import.meta.env.DEV) (window as any)._DEBUG_gameInstance = this;
  }

  async init() {
    await this.loadAndPrepareGame();

    const preferredTranslation = this.translations.find(({ code }) =>
      code.includes(localStorage.getItem("language") ?? ""),
    );
    if (preferredTranslation) this.translation = preferredTranslation;
    else this.translation = this.translations[0];
  }

  private createCanvas(): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.oncontextmenu = (e) => e.preventDefault();

    (document.getElementById("game") ?? document.body).appendChild(canvas);
    return canvas;
  }

  public update(_deltaTime: number, _unscaledDeltaTime: number): void {
    const { InputManager, LevelManager, GameManager, CameraManager, AssetManager, EntityManager } = this.MANAGERS;
    if (!GameManager.isPlaying() && !AssetManager.getIsReady()) return;

    if (import.meta.env.DEV) {
      if (InputManager.wasPressed(GameControls.DEBUG_MENU)) {
        InputManager.consumeAction(GameControls.DEBUG_MENU);
        this._debugPanel?.toggle();
      }
    }

    InputManager.updateBefore(_deltaTime);
    EntityManager.updateBefore(_deltaTime, _unscaledDeltaTime);

    const player = this.MANAGERS.LevelManager.player;
    if (player) CameraManager.followPlayer(_deltaTime, player._getWorldPosition());

    LevelManager.update(_deltaTime);
    CameraManager.update(_deltaTime);

    EntityManager.updateAfter(_deltaTime, _unscaledDeltaTime);
  }

  private async loadAndPrepareGame(): Promise<void> {
    const { UIManager, GameManager, AssetManager } = this.MANAGERS;

    AssetManager._init();
    await AssetManager.preloadAssets();

    GameManager._init();
    GameManager.stateSetReady();

    UIManager._init();
    UIManager.showStartGameContainer();
  }

  public startGame = (): void => {
    const {
      BuildModeManager,
      UIManager,
      GameManager,
      CameraManager,
      EntityManager,
      DrawManager,
      InputManager,
      LevelManager,
      LightManager,
      SettingsManager,
      VFXManager,
    } = this.MANAGERS;
    if (this.MANAGERS.GameManager.getState() !== GameState.READY) return;

    // Asset manager was initialized in loadAndPrepareGame()
    BuildModeManager._init();
    CameraManager._init();
    EntityManager._init();
    DrawManager._init();
    InputManager._init();
    LevelManager._init();
    LightManager._init();
    SettingsManager._init();
    VFXManager._init();

    DrawManager.startRenderLoop();

    UIManager.hideStartGameContainer();
    UIManager.showUi();
    GameManager.stateSetPlaying();

    LevelManager.startGame();

    if (this.isDev) {
      this._debugPanel = new DebugPanel(this);
      this._debugPanel.subscribeToSettings();
    }
  };

  public stopAndQuitGame(): void {
    this.destroy();
  }

  public async restartGame(): Promise<void> {
    this.stopAndQuitGame();
    await this.init();
    this.startGame();
  }

  private destroy(): void {
    const {
      BuildModeManager,
      AssetManager,
      UIManager,
      GameManager,
      CameraManager,
      DrawManager,
      EntityManager,
      InputManager,
      LevelManager,
      LightManager,
      SettingsManager,
      VFXManager,
    } = this.MANAGERS;

    AssetManager._destroy();
    BuildModeManager._destroy();
    CameraManager._destroy();
    DrawManager._destroy();
    EntityManager._destroy();
    GameManager._destroy();
    InputManager._destroy();
    LevelManager._destroy();
    LightManager._destroy();
    SettingsManager._destroy();
    UIManager._destroy();
    VFXManager._destroy();
  }
}
