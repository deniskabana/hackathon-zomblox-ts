import { gameInstance } from "../../main";

export enum GameState {
  INITIALIZING,
  LOADING,
  READY,
  PLAYING_NIGHT,
  PLAYING_DAY,
  PAUSED,
  GAME_OVER,
}

export default class GameManager {
  private gameState: GameState = GameState.INITIALIZING;
  private prePauseState: GameState | undefined = undefined;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    this.stateSetLoading();
    await gameInstance.MANAGERS.AssetManager.preloadAssets();
    this.stateSetReady();
  }

  private stateSetLoading(): void {
    this.gameState = GameState.LOADING;
  }

  public stateSetReady(): void {
    if (this.gameState !== GameState.LOADING) {
      console.warn('Cannot set READY from state:', this.gameState);
      return;
    }
    this.gameState = GameState.READY;
  }

  public stateSetPlaying(cycle: 'day' | 'night' = 'night'): boolean {
    if (this.gameState === GameState.INITIALIZING || this.gameState === GameState.LOADING) {
      return false;
    }

    this.gameState = cycle === 'night' ? GameState.PLAYING_NIGHT : GameState.PLAYING_DAY;
    return true;
  }

  public stateSetPaused(pause: boolean): boolean {
    if (pause) {
      if (this.gameState !== GameState.PLAYING_DAY && this.gameState !== GameState.PLAYING_NIGHT) {
        return false;
      }
      this.prePauseState = this.gameState;
      this.gameState = GameState.PAUSED;
      return true;
    } else {
      if (this.gameState !== GameState.PAUSED || !this.prePauseState) {
        return false;
      }
      this.gameState = this.prePauseState;
      this.prePauseState = undefined; // Clear it after unpausing
      return true;
    }
  }

  public getState(): GameState {
    return this.gameState;
  }

  public isPlaying(): boolean {
    return this.gameState === GameState.PLAYING_DAY || this.gameState === GameState.PLAYING_NIGHT;
  }

  public isNight(): boolean {
    return this.gameState === GameState.PLAYING_NIGHT;
  }

  public isDay(): boolean {
    return this.gameState === GameState.PLAYING_DAY;
  }

  public isPaused(): boolean {
    return this.gameState === GameState.PAUSED;
  }
}
