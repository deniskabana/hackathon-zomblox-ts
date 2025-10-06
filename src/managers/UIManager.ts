import type { GameInstance } from "../../main";

export default class UIManager {
  instance: GameInstance;

  constructor(instance: GameInstance) {
    this.instance = instance;
  }
}
