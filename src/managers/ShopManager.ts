import type GameInstance from "../GameInstance";
import { AManager } from "./abstract/AManager";

export default class ShopManager extends AManager {
  constructor(gameInstance: GameInstance) {
    super(gameInstance);
  }

  _init() {}

  _destroy() {}
}
