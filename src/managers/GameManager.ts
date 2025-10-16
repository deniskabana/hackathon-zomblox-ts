import { DEFAULT_SETTINGS, KEY_SETTINGS, type Settings } from "../config/settings";
import type GameInstance from "../GameInstance";
import type { DeepPartial } from "../types/DeepPartial";
import { GameState } from "../types/GameState";
import { mergeDeep } from "../utils/mergeDeep";
import { AManager } from "./abstract/AManager";

export default class GameManager extends AManager {
  private gameState: GameState = GameState.INITIALIZING;
  private prePauseState: GameState | undefined = undefined;
  private gameSettings: Settings = DEFAULT_SETTINGS;

  constructor(gameInstance: GameInstance) {
    super(gameInstance);

    // Settings persistence
    const storedSettings = localStorage.getItem(KEY_SETTINGS);
    if (storedSettings !== null) {
      try {
        const settings = JSON.parse(storedSettings);
        if (settings) this.setSettings(settings);
      } catch {
        /* Swallow */
      }
    }

    this.stateSetLoading();
  }

  public init(): void {}

  private stateSetLoading(): void {
    this.gameState = GameState.LOADING;
  }

  public stateSetReady(): void {
    if (this.gameState !== GameState.LOADING) {
      console.warn("Cannot set READY from state:", this.gameState);
      return;
    }
    this.gameState = GameState.READY;
  }

  public stateSetPlaying(): boolean {
    if (this.gameState === GameState.INITIALIZING || this.gameState === GameState.LOADING) return false;
    this.gameState = GameState.PLAYING;
    return true;
  }

  public stateSetPaused(pause: boolean): boolean {
    if (pause) {
      if (this.gameState !== GameState.PLAYING) return false;
      this.prePauseState = this.gameState;
      this.gameState = GameState.PAUSED;
      return true;
    } else {
      if (this.gameState !== GameState.PAUSED || !this.prePauseState) return false;
      this.gameState = this.prePauseState;
      this.prePauseState = undefined;
      return true;
    }
  }

  public getState(): GameState {
    return this.gameState;
  }

  public setSettings(settings: DeepPartial<Settings>): void {
    const newSettings = mergeDeep({ ...this.gameSettings }, settings);
    this.gameSettings = newSettings;
    localStorage.setItem(KEY_SETTINGS, JSON.stringify(this.gameSettings));
  }

  public getSettings(): Settings {
    return this.gameSettings;
  }

  public isPlaying(): boolean {
    return this.gameState === GameState.PLAYING;
  }

  public isPaused(): boolean {
    return this.gameState === GameState.PAUSED;
  }

  public destroy(): void {}
}
