import { GRID_CONFIG, gridToWorld, worldToGrid, type GridPosition, type WorldPosition } from "../config/gameGrid";
import type BlockWood from "../entities/BlockWood";
import type GameInstance from "../GameInstance";
import type { ScreenPosition } from "../types/ScreenPosition";
import { AManager } from "./abstract/AManager";

export default class LightManager extends AManager {
  private lightMaskCanvas: HTMLCanvasElement | undefined;
  private ctx: CanvasRenderingContext2D | undefined;

  private shadowMaskCanvas: HTMLCanvasElement | undefined;
  private shadowCtx: CanvasRenderingContext2D | undefined;

  private readonly nightOverlayAlpha = 0.9;
  private readonly playerLightRadius = GRID_CONFIG.TILE_SIZE * 4;
  private readonly playerLightConeLen = GRID_CONFIG.TILE_SIZE * 10;

  constructor(gameInstance: GameInstance) {
    super(gameInstance);
  }

  public init(): void {
    this.lightMaskCanvas = document.createElement("canvas");
    this.shadowMaskCanvas = document.createElement("canvas");

    const ctx = this.lightMaskCanvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get 2D context from canvas");
    this.ctx = ctx;

    const shadowCtx = this.shadowMaskCanvas.getContext("2d");
    if (!shadowCtx) throw new Error("Failed to get 2D context from shadowMaskCanvas");
    this.shadowCtx = shadowCtx;
  }

  public destroy(): void {
    this.lightMaskCanvas?.remove();
    this.lightMaskCanvas = undefined;
    this.shadowMaskCanvas?.remove();
    this.shadowMaskCanvas = undefined;
  }

  // Utils
  // ==================================================

  public updateCanvasSize(): void {
    if (!this.lightMaskCanvas || !this.shadowMaskCanvas) return;
    const gameCanvas = this.gameInstance.canvas;

    this.lightMaskCanvas.style.width = gameCanvas.style.width;
    this.lightMaskCanvas.style.height = gameCanvas.style.height;
    this.shadowMaskCanvas.style.width = gameCanvas.style.width;
    this.shadowMaskCanvas.style.height = gameCanvas.style.height;

    this.lightMaskCanvas.width = gameCanvas.width;
    this.lightMaskCanvas.height = gameCanvas.height;
    this.shadowMaskCanvas.width = gameCanvas.width;
    this.shadowMaskCanvas.height = gameCanvas.height;
  }

  /**
   * Draws a lightning radius around the player
   */
  public drawNightLighting(playerWorldPos: WorldPosition, facingAngle: number, blocks: Map<number, BlockWood>): void {
    if (!this.ctx || !this.lightMaskCanvas || !this.shadowCtx || !this.shadowMaskCanvas) return;

    const { CameraManager, DrawManager } = this.gameInstance.MANAGERS;
    const playerScreenPos = CameraManager.worldToScreen(playerWorldPos);
    const zoom = CameraManager.zoom;

    this.ctx.clearRect(0, 0, this.lightMaskCanvas.width, this.lightMaskCanvas.height);
    this.shadowCtx.clearRect(0, 0, this.shadowMaskCanvas.width, this.shadowMaskCanvas.height);

    this.ctx.save();
    this.ctx.fillStyle = `rgba(0, 0, 0, ${this.nightOverlayAlpha})`;
    this.ctx.fillRect(0, 0, this.lightMaskCanvas.width, this.lightMaskCanvas.height);

    const lightRadius = this.playerLightRadius * zoom;
    const gradient = this.ctx.createRadialGradient(
      playerScreenPos.x,
      playerScreenPos.y,
      0,
      playerScreenPos.x,
      playerScreenPos.y,
      lightRadius,
    );
    gradient.addColorStop(0, "rgba(0, 0, 0, 1)");
    gradient.addColorStop(0.7, `rgba(0, 0, 0, ${this.nightOverlayAlpha})`);
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

    this.ctx.globalCompositeOperation = "destination-out";
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(
      playerScreenPos.x - lightRadius,
      playerScreenPos.y - lightRadius,
      lightRadius * 2,
      lightRadius * 2,
    );
    this.ctx.restore();

    this.drawLightCone(playerScreenPos, facingAngle, zoom);
    this.drawBlocksLight(playerWorldPos, blocks, zoom);
    this.ctx.globalCompositeOperation = "source-over";
    this.ctx.drawImage(this.shadowMaskCanvas, 0, 0);

    const gameCanvasCtx = DrawManager.getContext();
    if (!gameCanvasCtx) return;

    gameCanvasCtx.drawImage(this.lightMaskCanvas, 0, 0, this.lightMaskCanvas.width, this.lightMaskCanvas.height);
  }

  /**
   * Draws a light cone in the desired direction.
   */
  private drawLightCone(playerScreen: ScreenPosition, facingAngle: number, zoom: number): void {
    if (!this.ctx) return;
    const coneLength = this.playerLightConeLen * zoom;
    const coneWidth = Math.PI / 4;

    this.ctx.save();
    this.ctx.translate(playerScreen.x, playerScreen.y);
    this.ctx.rotate(facingAngle);

    const gradient = this.ctx.createLinearGradient(0, 0, coneLength, 0);
    gradient.addColorStop(0, `rgba(0, 0, 0, ${this.nightOverlayAlpha})`);
    gradient.addColorStop(0.5, `rgba(0, 0, 0, ${this.nightOverlayAlpha / 2})`);
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

    this.ctx.globalCompositeOperation = "destination-out";
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.moveTo(0, 0);
    this.ctx.arc(0, 0, coneLength, -coneWidth / 2, coneWidth / 2);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.restore();
  }

  /**
   * Draws a fake shadow from each block
   */
  private drawBlocksLight(playerWorld: WorldPosition, blocks: Map<number, BlockWood>, zoom: number): void {
    if (!this.shadowCtx) return;
    const shadowDistance = GRID_CONFIG.TILE_SIZE * 8;

    for (const [_id, block] of blocks) {
      if (!this.gameInstance.MANAGERS.CameraManager.isOnScreen(block.worldPos)) continue;

      const corners: GridPosition[] = [
        { x: block.gridPos.x, y: block.gridPos.y },
        { x: block.gridPos.x + 1, y: block.gridPos.y },
        { x: block.gridPos.x + 1, y: block.gridPos.y + 1 },
        { x: block.gridPos.x, y: block.gridPos.y + 1 },
      ];

      const playerGrid = worldToGrid(playerWorld);
      let closestIndex = 0;
      let closestDist = Infinity;

      for (let i = 0; i < corners.length; i++) {
        const dx = corners[i].x - playerGrid.x;
        const dy = corners[i].y - playerGrid.y;
        const dist = dx * dx + dy * dy;

        if (dist < closestDist) {
          closestDist = dist;
          closestIndex = i;
        }
      }

      // Remove closest corner, keep the other 3
      corners.splice(closestIndex, 1);

      const playerScreen = this.gameInstance.MANAGERS.CameraManager.worldToScreen(playerWorld);
      const projectedCorners = corners.map((corner) => {
        const cornerWorld = gridToWorld(corner);
        const cornerScreen = this.gameInstance.MANAGERS.CameraManager.worldToScreen(cornerWorld);
        return this.projectPoint(cornerScreen, playerScreen, shadowDistance * zoom);
      });

      this.shadowCtx.save();
      this.shadowCtx.fillStyle = `rgba(0, 0, 0, ${this.nightOverlayAlpha})`;
      this.shadowCtx.beginPath();

      const corner0Screen = this.gameInstance.MANAGERS.CameraManager.worldToScreen(gridToWorld(corners[0]));
      this.shadowCtx.moveTo(corner0Screen.x, corner0Screen.y);
      const corner1Screen = this.gameInstance.MANAGERS.CameraManager.worldToScreen(gridToWorld(corners[1]));
      this.shadowCtx.lineTo(corner1Screen.x, corner1Screen.y);
      const corner2Screen = this.gameInstance.MANAGERS.CameraManager.worldToScreen(gridToWorld(corners[2]));
      this.shadowCtx.lineTo(corner2Screen.x, corner2Screen.y);
      // Projected points (in reverse order to close the shape)
      this.shadowCtx.lineTo(projectedCorners[2].x, projectedCorners[2].y);
      this.shadowCtx.lineTo(projectedCorners[1].x, projectedCorners[1].y);
      this.shadowCtx.lineTo(projectedCorners[0].x, projectedCorners[0].y);

      this.shadowCtx.closePath();
      this.shadowCtx.fill();
      this.shadowCtx.restore();
    }

    this.shadowCtx.save();
    this.shadowCtx.globalCompositeOperation = "destination-out";
    for (const block of blocks.values()) block.drawMask(this.shadowCtx);
    this.shadowCtx.restore();
  }

  private projectPoint(point: WorldPosition, lightSource: WorldPosition, distance: number): WorldPosition {
    const dx = point.x - lightSource.x;
    const dy = point.y - lightSource.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length === 0) return point;

    return {
      x: point.x + (dx / length) * distance,
      y: point.y + (dy / length) * distance,
    };
  }
}
