import type { GameInstance } from "../../main";

export default class DrawManager {
  instance: GameInstance;

  constructor(instance: GameInstance) {
    this.instance = instance;
  }
}
