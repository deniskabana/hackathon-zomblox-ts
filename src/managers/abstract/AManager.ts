import type GameInstance from "../../GameInstance";

export abstract class AManager {
  public gameInstance: GameInstance;

  constructor(gameInstance: GameInstance) {
    this.gameInstance = gameInstance;
  }

  public abstract init(): void;
}
