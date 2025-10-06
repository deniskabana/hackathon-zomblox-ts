import type { GameInstance } from "../../main";

export default class GameManager {
  instance: GameInstance;

  constructor(instance: GameInstance) {
    this.instance = instance;
  }
}
