import { GRID_CONFIG, gridToWorld, worldToGrid, type GridPosition } from "../config/gameGrid";
import type GameInstance from "../GameInstance";
import { GridTileState } from "../types/Grid";
import { ZIndex } from "../types/ZIndex";
import isInsideGrid from "../utils/grid/isInsideGrid";
import areVectorsEqual from "../utils/math/areVectorsEqual";
import { AManager } from "./abstract/AManager";

export default class BuildModeManager extends AManager {
  public isBuildModeActive: boolean;
  private activeGridTile: GridPosition | undefined;
  private reachableBlocks: GridPosition[] | undefined;
  private unreachableBlocks: GridPosition[] | undefined;

  constructor(gameInstance: GameInstance) {
    super(gameInstance);

    this.isBuildModeActive = false;
  }

  public init(): void {
    this.isBuildModeActive = false;
    this.activeGridTile = undefined;
  }

  public destroy(): void {
    this.setBuildMode(false);
  }

  public draw(): void {
    if (!this.isBuildModeActive) return;

    const sprite = this.gameInstance.MANAGERS.AssetManager.getImageAsset("IBlockWood");
    if (this.activeGridTile && sprite) {
      const worldPos = gridToWorld(this.activeGridTile);
      this.gameInstance.MANAGERS.DrawManager.queueDraw(
        worldPos.x,
        worldPos.y,
        sprite,
        GRID_CONFIG.TILE_SIZE,
        GRID_CONFIG.TILE_SIZE,
        ZIndex.BLOCKS,
        0,
        0.65,
      );
      this.gameInstance.MANAGERS.DrawManager.drawText(
        "✔︎",
        worldPos.x + GRID_CONFIG.TILE_SIZE / 2,
        worldPos.y + GRID_CONFIG.TILE_SIZE * 0.7,
        "#ffffff",
        25,
        "Arial",
        "center",
      );
    }

    this.updateReachableBlocks();
    if (this.reachableBlocks) {
      for (const blockPos of this.reachableBlocks) {
        const worldPos = gridToWorld(blockPos);
        this.gameInstance.MANAGERS.DrawManager.drawRectFilled(
          worldPos.x + 1,
          worldPos.y + 1,
          GRID_CONFIG.TILE_SIZE - 2,
          GRID_CONFIG.TILE_SIZE - 2,
          "#22bb444f",
        );
      }
    }
    if (this.unreachableBlocks) {
      for (const blockPos of this.unreachableBlocks) {
        const worldPos = gridToWorld(blockPos);
        this.gameInstance.MANAGERS.DrawManager.drawRectFilled(
          worldPos.x + 1,
          worldPos.y + 1,
          GRID_CONFIG.TILE_SIZE - 2,
          GRID_CONFIG.TILE_SIZE - 2,
          "#9922336f",
        );
      }
    }
  }

  // Utils
  // ==================================================

  /**
   * Toggle build mode
   */
  public setBuildMode(active: boolean): void {
    if (active) {
      if (!this.gameInstance.MANAGERS.LevelManager.getIsDay()) return;
      // TODO: this.gameInstance.MANAGERS.UIManager.showBuildModeToolbar();
      document.addEventListener("touchend", this.handleScreenTouch);
      document.addEventListener("mouseup", this.handleScreenTouch);
    } else {
      // TODO: this.gameInstance.MANAGERS.UIManager.hideBuildModeToolbar();
      document.removeEventListener("touchend", this.handleScreenTouch);
      document.removeEventListener("mouseup", this.handleScreenTouch);

      this.activeGridTile = undefined;
      this.reachableBlocks = undefined;
      this.setBuildPosition(undefined);
    }

    this.isBuildModeActive = active;
  }

  /**
   * Get a list of GridPositions representing the blocks the player can build on
   */
  private updateReachableBlocks(): void {
    const player = this.gameInstance.MANAGERS.LevelManager.player;
    if (!player) return;

    const threshold = 2;
    const reachableBlocks: typeof this.reachableBlocks = [];
    const unreachableBlocks: typeof this.unreachableBlocks = [];

    for (let x = -threshold; x <= threshold; x++) {
      for (let y = -threshold; y <= threshold; y++) {
        const currentPos: GridPosition = {
          x: player.gridPos.x + x,
          y: player.gridPos.y + y,
        };

        const isOnCorner = Math.abs(x) === Math.abs(threshold) && Math.abs(y) === Math.abs(threshold);
        const isPlayerPos = areVectorsEqual(player.gridPos, currentPos);
        if (isOnCorner || isPlayerPos) continue;

        const levelGrid = this.gameInstance.MANAGERS.LevelManager.levelGrid;
        const isUnavailable = levelGrid?.[currentPos.x]?.[currentPos.y]?.state === GridTileState.BLOCKED;

        if (isInsideGrid(currentPos) && !isUnavailable) {
          reachableBlocks.push(currentPos);
        } else {
          unreachableBlocks.push(currentPos);
        }
      }
    }

    this.reachableBlocks = reachableBlocks;
    this.unreachableBlocks = unreachableBlocks;

    const gridPos = this.activeGridTile;
    if (!gridPos) return;
    const isSelectedReachable = this.reachableBlocks?.reduce<boolean>(
      (acc, val) => (areVectorsEqual(gridPos, val) ? true : acc),
      false,
    );
    if (!isSelectedReachable) this.activeGridTile = undefined;
  }

  /**
   * Build a block if possible
   * @returns `true` if successful.
   */
  public confirmBuild(): boolean {
    let hasBuilt = false;
    const levelGrid = this.gameInstance.MANAGERS.LevelManager.levelGrid;
    const gridPos = this.activeGridTile;

    this.updateReachableBlocks();
    if (!gridPos || !isInsideGrid(gridPos) || !this.reachableBlocks) return hasBuilt;
    if (!levelGrid || levelGrid[gridPos.x][gridPos.y].state !== GridTileState.AVAILABLE) return hasBuilt;

    const isAvailable = this.reachableBlocks.reduce<boolean>(
      (acc, val) => (areVectorsEqual(gridPos, val) ? true : acc),
      false,
    );
    if (isAvailable) {
      this.gameInstance.MANAGERS.LevelManager.spawnBlock(gridPos);
      this.gameInstance.MANAGERS.AssetManager.playAudioAsset("ABlockWoodPlaced", "sound");
      hasBuilt = true;
    }

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

    this.gameInstance.MANAGERS.AssetManager.playAudioAsset("AFXUiClick", "sound");

    const isAvailable = this.reachableBlocks?.reduce<boolean>(
      (acc, val) => (areVectorsEqual(gridPos, val) ? true : acc),
      false,
    );
    if (!isAvailable) return;

    this.activeGridTile = gridPos;
  }

  /**
   * Handles clicking / touching the screen
   */
  private handleScreenTouch = (event: TouchEvent | MouseEvent): void => {
    if (!this.isBuildModeActive || !this.reachableBlocks) return;

    let targetPos: GridPosition | undefined;
    const rect = this.gameInstance.canvas.getBoundingClientRect();

    if ("changedTouches" in event) {
      for (const touch of event.changedTouches) {
        const touchPosGrid = worldToGrid(
          this.gameInstance.MANAGERS.CameraManager.screenToWorld({
            x: touch.clientX - rect.x,
            y: touch.clientY - rect.y,
          }),
        );
        const isAllowed = this.reachableBlocks.reduce<boolean>(
          (acc, val) => (areVectorsEqual(touchPosGrid, val) ? true : acc),
          false,
        );
        if (isAllowed) targetPos = touchPosGrid;
      }
    } else {
      targetPos = worldToGrid(
        this.gameInstance.MANAGERS.CameraManager.screenToWorld({
          x: event.clientX - rect.x,
          y: event.clientY - rect.y,
        }),
      );
    }

    if (this.activeGridTile) {
      if (areVectorsEqual(this.activeGridTile, targetPos)) {
        this.confirmBuild();
      } else {
        this.setBuildPosition(undefined);
      }
    } else {
      this.setBuildPosition(targetPos);
    }
  };
}
