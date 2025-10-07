import { GRID_CONFIG, gridToWorld, WORLD_SIZE } from "../config/gameGrid";
import Player from "../entities/Player";
import { gameInstance } from "../main";
import type { LevelState } from "../types/LevelState";
import { ZIndex } from "./DrawManager";

enum GridType { AVAILABLE, BLOCKED, PLAYER }

export default class LevelManager {
  public worldWidth = WORLD_SIZE.WIDTH;
  public worldHeight = WORLD_SIZE.HEIGHT;
  public levelState: LevelState;
  public levelGrid: GridType[][];

  public player: Player;

  constructor() {
    this.levelState = {
      phase: "night",
      daysCounter: 0,
    };

    const levelGrid: typeof this.levelGrid = [];
    for (let x = 0; x < GRID_CONFIG.GRID_WIDTH; x++) {
      const columns: GridType[] = [];
      for (let y = 0; y < GRID_CONFIG.GRID_HEIGHT; y++) {
        columns.push(GridType.AVAILABLE);
      }
      levelGrid.push(columns);
    }
    this.levelGrid = levelGrid;

    this.player = new Player({ x: 220, y: 160 });
  }

  public drawEntities(_deltaTime: number): void {
    this.player.draw(_deltaTime);

    this.levelGrid.forEach((gridRow, x) => {
      gridRow.forEach((_gridCol, y) => {
        const tileWorldPos = gridToWorld({ x, y });
        const texture =
          gameInstance.MANAGERS.AssetManager.getImageAsset("ITextureGround");
        if (!texture) return;

        gameInstance.MANAGERS.DrawManager.queueDraw(
          tileWorldPos.x,
          tileWorldPos.y,
          texture,
          GRID_CONFIG.TILE_SIZE,
          GRID_CONFIG.TILE_SIZE,
          ZIndex.GROUND,
        );
      });
    });
  }

  public endNight() {
    if (this.levelState.phase !== "night") return;
    this.levelState.phase = "day";
    this.levelState.daysCounter += 1;
    gameInstance.MANAGERS.GameManager.stateSetPlaying("day");
    // TODO: UI and game changes
  }

  public endDay() {
    if (this.levelState.phase !== "day") return;
    this.levelState.phase = "night";
    gameInstance.MANAGERS.GameManager.stateSetPlaying("night");
    // TODO: UI and game changes
  }
}
