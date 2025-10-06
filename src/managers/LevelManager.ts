import { WORLD_SIZE } from "../config/gameGrid";
import { gameInstance } from "../main";
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

  public endNight() {
    if (this.levelState.phase !== 'night') return;
    this.levelState.phase = 'day';
    this.levelState.daysCounter += 1;
    gameInstance.MANAGERS.GameManager.stateSetPlaying('day')
    // TODO: UI and game changes
  }

  public endDay() {
    if (this.levelState.phase !== 'day') return;
    this.levelState.phase = 'night'
    gameInstance.MANAGERS.GameManager.stateSetPlaying('night')
    // TODO: UI and game changes
  }
}
