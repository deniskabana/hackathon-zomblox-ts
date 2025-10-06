import type { GameInstance } from "../../main";

export default class LevelManager {
  instance: GameInstance;

  constructor(instance: GameInstance) {
    this.instance = instance;
  }
}
