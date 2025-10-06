import { WORLD_SIZE } from "../config/gameGrid";
import type { LevelState } from "../types/LevelState";

export default class LevelManager {
  public worldWidth = WORLD_SIZE.WIDTH
  public worldHeight = WORLD_SIZE.HEIGHT
  public levelState: LevelState;

  constructor() {
    this.levelState = {
      phase: 'night',
      daysCounter: 0,
    }
  }
}
