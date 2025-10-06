import type { GameInstance } from "../../main";

export default class InputManager {
  instance: GameInstance;

  constructor(instance: GameInstance) {
    this.instance = instance;
  }
}
