import { WORLD_SIZE } from "../config/gameGrid";
import { gameInstance } from "../main";
import type { LevelState } from "../types/LevelState";

enum GridType {
  Available,
  Blocked,
  Player,
}

export default class LevelManager {
  public worldWidth = WORLD_SIZE.WIDTH
  public worldHeight = WORLD_SIZE.HEIGHT
  public levelState: LevelState;
  public levelGrid: GridType[][];

  constructor() {
    this.levelState = {
      phase: 'night',
      daysCounter: 0,
    }

    const levelGrid: typeof this.levelGrid = [];
    for (let x = 0; x < this.worldWidth; x++) {
      const columns: GridType[] = []
      for (let y = 0; y < this.worldHeight; y++) {
        columns.push(GridType.Available);
      }
      levelGrid.push(columns);
    }
    this.levelGrid = levelGrid;
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
