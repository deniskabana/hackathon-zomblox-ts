import { GRID_CONFIG, gridToWorld, type GridPosition } from "../config/gameGrid";
import type GameInstance from "../GameInstance";
import { GridTileState } from "../types/Grid";
import { ZIndex } from "../types/ZIndex";
import isInsideGrid from "../utils/grid/isInsideGrid";
import areVectorsEqual from "../utils/math/areVectorsEqual";
import { AManager } from "./abstract/AManager";

export default class BuildModeManager extends AManager {
  private isBuildModeActive: boolean;
  private activeGridTile: GridPosition | undefined;

  constructor(gameInstance: GameInstance) {
    super(gameInstance);

    this.isBuildModeActive = false;
  }

  public init(): void {
    this.isBuildModeActive = false;
    this.activeGridTile = undefined;
  }

  public destroy(): void {}

  public draw(): void {
    if (!this.isBuildModeActive || !this.activeGridTile) return;

    const sprite = this.gameInstance.MANAGERS.AssetManager.getImageAsset("IBlockWood");
    if (!sprite) return;

    const worldPos = gridToWorld(this.activeGridTile);

    this.gameInstance.MANAGERS.DrawManager.queueDraw(
      worldPos.x,
      worldPos.y,
      sprite,
      GRID_CONFIG.TILE_SIZE,
      GRID_CONFIG.TILE_SIZE,
      ZIndex.BLOCKS,
      0,
      0.4,
    );
  }

  // Utils
  // ==================================================

  /**
   * Toggle build mode
   */
  public setBuildMode(active: boolean): void {
    if (this.gameInstance.MANAGERS.LevelManager.levelState?.phase !== "day") return;

    this.isBuildModeActive = active;

    if (active) {
      // TODO: Implement when toolbar is needed for choosing multiple blocks
      // this.gameInstance.MANAGERS.UIManager.showBuildModeToolbar();
    } else {
      // TODO: ...also...
      // this.gameInstance.MANAGERS.UIManager.hideBuildModeToolbar();
      this.activeGridTile = undefined;
    }
  }

  /**
   * Get a list of GridPositions representing the blocks the player can build on
   */
  public getReachableBlocks(): GridPosition[] {
    const player = this.gameInstance.MANAGERS.LevelManager.player;
    if (!player) return [];

    const threshold = 3;
    const reachableBlocks: ReturnType<typeof this.getReachableBlocks> = [];

    for (let x = -threshold; x < threshold; x++) {
      for (let y = -threshold; y < threshold; y++) {
        const currentPos: GridPosition = {
          x: player.gridPos.x + threshold,
          y: player.gridPos.y + threshold,
        };

        if (!isInsideGrid(currentPos)) continue;

        // Ignore player and their closely surrounding tiles
        if (x >= player.gridPos.x - 1 && x <= player.gridPos.x + 1) continue;
        if (y >= player.gridPos.y - 1 && y <= player.gridPos.y + 1) continue;

        reachableBlocks.push(currentPos);
      }
    }

    return reachableBlocks;
  }

  /**
   * Build a block if possible
   * @returns `true` if successful.
   */
  public confirmBuild(): boolean {
    let hasBuilt = false;
    const levelGrid = this.gameInstance.MANAGERS.LevelManager.levelGrid;
    const gridPos = this.activeGridTile;

    if (!gridPos || !isInsideGrid(gridPos)) return hasBuilt;
    if (!levelGrid || levelGrid[gridPos.x][gridPos.y].state !== GridTileState.AVAILABLE) return hasBuilt;

    const isAvailable = this.getReachableBlocks().reduce<boolean>(
      (acc, val) => (areVectorsEqual(gridPos, val) ? true : acc),
      false,
    );
    if (isAvailable) {
      this.gameInstance.MANAGERS.LevelManager.spawnBlock(gridPos);
      hasBuilt = true;
    }

    this.setBuildMode(false);
    return hasBuilt;
  }

  /**
   * Set a build position that will render a ghost and will wait for confirmation
   * @param gridPos - `undefined` clears active pos
   */
  public setBuildPosition(gridPos: GridPosition | undefined): void {
    if (!this.isBuildModeActive) return;

    if (!gridPos) {
      this.activeGridTile = undefined;
      return;
    }

    if (!isInsideGrid(gridPos)) return;
    this.activeGridTile = gridPos;
  }
}
