import type GameInstance from "../../GameInstance";
import { GameState } from "../../types/GameState";
import { AManager } from "../abstract/AManager";

export default class GameManager extends AManager {
  private gameState: GameState = GameState.INITIALIZING;
  private prePauseState: GameState | undefined = undefined;

  constructor(gameInstance: GameInstance) {
    super(gameInstance);
  }

  public _init(): void {
    this.stateSetLoading();
  }

  private stateSetLoading(): void {
    this.gameState = GameState.LOADING;
  }

  public stateSetReady(): void {
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

  public isPlaying(): boolean {
    return this.gameState === GameState.PLAYING;
  }

  public isPaused(): boolean {
    return this.gameState === GameState.PAUSED;
  }

  public _destroy(): void {
    this.gameState = GameState.INITIALIZING;
  }
}
