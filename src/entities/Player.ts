import type { WorldPosition } from "../config/gameGrid";
import AEntity from "./AEntity";

export default class Player extends AEntity {
  constructor(worldPos: WorldPosition) {
    super(worldPos, true);
  }
}

