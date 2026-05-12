import type GameInstance from "../../GameInstance";

export abstract class AManager {
  protected readonly gameInstance: GameInstance;

  constructor(gameInstance: GameInstance) {
    this.gameInstance = gameInstance;
  }

  public abstract _init(): void;
  public abstract _destroy(): void;
}
