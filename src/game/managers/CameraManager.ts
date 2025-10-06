import type { GameInstance } from "../../main";

export default class CameraManager {
  instance: GameInstance;

  constructor(instance: GameInstance) {
    this.instance = instance;
  }
}
