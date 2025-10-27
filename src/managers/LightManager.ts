import { GRID_CONFIG, gridToWorld, type GridPosition, type WorldPosition } from "../config/gameGrid";
import type BlockWood from "../entities/BlockWood";
import type GameInstance from "../GameInstance";
import type { ScreenPosition } from "../types/ScreenPosition";
import { AManager } from "./abstract/AManager";

export default class LightManager extends AManager {
  private lightMaskCanvas: HTMLCanvasElement | undefined;
  private ctx: CanvasRenderingContext2D | undefined;

  private shadowMaskCanvas: HTMLCanvasElement | undefined;
  private shadowCtx: CanvasRenderingContext2D | undefined;

  private readonly nightOverlayAlpha = 1;
  private readonly playerLightRadius = GRID_CONFIG.TILE_SIZE * 3.2;
  private readonly playerLightConeLen = GRID_CONFIG.TILE_SIZE * 8;

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
    this.drawBlocksShadow(playerWorldPos, blocks, zoom);

    this.ctx.save();
    this.ctx.globalAlpha = this.nightOverlayAlpha / 1.3;
    this.ctx.globalCompositeOperation = "source-over";
    this.ctx.drawImage(this.shadowMaskCanvas, 0, 0);
    this.ctx.restore();

    const gameCanvasCtx = DrawManager.getContext();
    if (!gameCanvasCtx) return;

    gameCanvasCtx.save();
    gameCanvasCtx.globalAlpha = 0.9;
    gameCanvasCtx.drawImage(this.lightMaskCanvas, 0, 0, this.lightMaskCanvas.width, this.lightMaskCanvas.height);
    gameCanvasCtx.restore();
  }

  /**
   * Draws a light cone in facing direction; allows see-through walls
   */
  private drawLightCone(playerScreen: ScreenPosition, facingAngle: number, zoom: number): void {
    if (!this.ctx) return;
    const coneLength = this.playerLightConeLen * zoom;
    const coneWidth = Math.PI / 5;

    this.ctx.save();
    this.ctx.translate(playerScreen.x, playerScreen.y);
    this.ctx.rotate(facingAngle);

    const gradient = this.ctx.createLinearGradient(0, 0, coneLength, 0);
    gradient.addColorStop(0, `rgba(0, 0, 0, ${this.nightOverlayAlpha})`);
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
   * Draws shadows cast by blocks away from the player's light
   */
  private drawBlocksShadow(playerWorld: WorldPosition, blocks: Map<number, BlockWood>, zoom: number): void {
    if (!this.shadowCtx) return;

    const levelGrid = this.gameInstance.MANAGERS.LevelManager.levelGrid;
    if (!levelGrid) return;

    const playerScreen = this.gameInstance.MANAGERS.CameraManager.worldToScreen(playerWorld);
    const shadowLength = GRID_CONFIG.TILE_SIZE * 8 * zoom;

    for (const block of blocks.values()) {
      if (!this.gameInstance.MANAGERS.CameraManager.isOnScreen(block.worldPos)) continue;
      this.drawEdgeShadows(block.gridPos, playerScreen, shadowLength);
    }

    this.shadowCtx.save();
    this.shadowCtx.globalCompositeOperation = "destination-out";
    for (const block of blocks.values()) block.drawMask(this.shadowCtx);
    this.shadowCtx.restore();
  }

  /**
   * Draw shadows from all of the edges
   */
  private drawEdgeShadows(gridPos: GridPosition, playerScreen: ScreenPosition, shadowLength: number): void {
    if (!this.shadowCtx) return;

    const edges = [
      { corner1: { x: gridPos.x, y: gridPos.y }, corner2: { x: gridPos.x + 1, y: gridPos.y } },
      { corner1: { x: gridPos.x + 1, y: gridPos.y }, corner2: { x: gridPos.x + 1, y: gridPos.y + 1 } },
      { corner1: { x: gridPos.x + 1, y: gridPos.y + 1 }, corner2: { x: gridPos.x, y: gridPos.y + 1 } },
      { corner1: { x: gridPos.x, y: gridPos.y + 1 }, corner2: { x: gridPos.x, y: gridPos.y } },
    ];

    for (const edge of edges) {
      const corner1Screen = this.gameInstance.MANAGERS.CameraManager.worldToScreen(gridToWorld(edge.corner1));
      const corner2Screen = this.gameInstance.MANAGERS.CameraManager.worldToScreen(gridToWorld(edge.corner2));

      const projected1 = this.projectPoint(corner1Screen, playerScreen, shadowLength);
      const projected2 = this.projectPoint(corner2Screen, playerScreen, shadowLength);

      this.shadowCtx.save();
      this.shadowCtx.fillStyle = "#000000";
      this.shadowCtx.beginPath();
      this.shadowCtx.moveTo(corner1Screen.x, corner1Screen.y);
      this.shadowCtx.lineTo(corner2Screen.x, corner2Screen.y);
      this.shadowCtx.lineTo(projected2.x, projected2.y);
      this.shadowCtx.lineTo(projected1.x, projected1.y);
      this.shadowCtx.closePath();
      this.shadowCtx.fill();
      this.shadowCtx.restore();
    }
  }

  /**
   * Project a shadow point in a direction.
   */
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
