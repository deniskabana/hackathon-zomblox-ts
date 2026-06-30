import type GameInstance from "../GameInstance";
import { AManager } from "./abstract/AManager";

export default class UIManager extends AManager {
  constructor(gameInstance: GameInstance) {
    super(gameInstance);
  }

  public _init(): void {}

  public draw(_fps: number): void {}

  public _destroy(): void {}

  public showGameOverScreen(): void {}

  public hideGameOverScreen(): void {}
}
