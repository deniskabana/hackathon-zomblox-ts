import type GameInstance from "../../GameInstance";

export abstract class AManager {
  protected readonly gameInstance: GameInstance;

  constructor(gameInstance: GameInstance) {
    this.gameInstance = gameInstance;
  }

  public abstract init(): void;
  public abstract destroy(): void;
}
