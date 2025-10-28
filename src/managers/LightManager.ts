import { GRID_CONFIG, gridToWorld, type GridPosition, type WorldPosition } from "../config/gameGrid";
import type ABlock from "../entities/abstract/ABlock";
import type GameInstance from "../GameInstance";
import type { ScreenPosition } from "../types/ScreenPosition";
import { AManager } from "./abstract/AManager";

export default class LightManager extends AManager {
  private lightMaskCanvas: HTMLCanvasElement | undefined;
  private ctx: CanvasRenderingContext2D | undefined;

  private shadowMaskCanvas: HTMLCanvasElement | undefined;
  private shadowCtx: CanvasRenderingContext2D | undefined;

  private readonly nightOverlayAlpha = 1;
  private readonly playerLightRadius = 1.8;
  private readonly playerLightConeLen = GRID_CONFIG.TILE_SIZE * 7;

  private lightSourceIdCount: number = 0;
  private lightSources: Map<number, WorldPosition> = new Map();

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
    this.lightSources.clear();
  }

  // Utils
  // ==================================================

  public addLightSource(worldPos: WorldPosition): number {
    const id = ++this.lightSourceIdCount;
    this.lightSources.set(id, worldPos);
    return id;
  }

  public removeLightSource(id: number): void {
    this.lightSources.delete(id);
  }

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
  public drawNightLighting(players: WorldPosition[], facingAngle: number, blocks: Map<number, ABlock>): void {
    const { CameraManager, DrawManager } = this.gameInstance.MANAGERS;
    const zoom = CameraManager.zoom;
    if (!this.ctx || !this.lightMaskCanvas || !this.shadowCtx || !this.shadowMaskCanvas) return;

    this.ctx.clearRect(0, 0, this.lightMaskCanvas.width, this.lightMaskCanvas.height);
    this.shadowCtx.clearRect(0, 0, this.shadowMaskCanvas.width, this.shadowMaskCanvas.height);

    this.ctx.save();
    this.ctx.fillStyle = `rgba(0, 0, 0, ${this.nightOverlayAlpha})`;
    this.ctx.fillRect(0, 0, this.lightMaskCanvas.width, this.lightMaskCanvas.height);
    this.ctx.restore();

    for (const player of players) {
      const lightScreenPos = CameraManager.worldToScreen(player);
      this.drawRadialLight(lightScreenPos, this.playerLightRadius);
      this.drawLightCone(lightScreenPos, facingAngle, zoom);
      this.drawBlocksShadow(lightScreenPos, blocks, zoom);
    }
    this.ctx.drawImage(this.shadowMaskCanvas, 0, 0);

    for (const lightSource of this.lightSources.values()) {
      const lightScreenPos = CameraManager.worldToScreen({
        x: lightSource.x + GRID_CONFIG.TILE_SIZE / 2,
        y: lightSource.y + GRID_CONFIG.TILE_SIZE / 2,
      });
      this.drawRadialLight(lightScreenPos, 3);
    }

    const gameCanvasCtx = DrawManager.getContext();
    if (!gameCanvasCtx) return;
    gameCanvasCtx.save();
    gameCanvasCtx.globalAlpha = 0.9;
    gameCanvasCtx.drawImage(this.lightMaskCanvas, 0, 0, this.lightMaskCanvas.width, this.lightMaskCanvas.height);
    gameCanvasCtx.restore();
  }

  private drawRadialLight(lightScreenPos: ScreenPosition, strength: number = 1): void {
    if (!this.ctx) return;
    const zoom = this.gameInstance.MANAGERS.CameraManager.zoom;

    this.ctx.save();
    const lightRadius = GRID_CONFIG.TILE_SIZE * zoom * strength;
    const gradient = this.ctx.createRadialGradient(
      lightScreenPos.x,
      lightScreenPos.y,
      0,
      lightScreenPos.x,
      lightScreenPos.y,
      lightRadius,
    );
    gradient.addColorStop(0, "rgba(0, 0, 0, 1)");
    gradient.addColorStop(0.5, `rgba(0, 0, 0, ${this.nightOverlayAlpha})`);
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

    this.ctx.globalCompositeOperation = "destination-out";
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(lightScreenPos.x - lightRadius, lightScreenPos.y - lightRadius, lightRadius * 2, lightRadius * 2);
    this.ctx.globalCompositeOperation = "source-over";
    this.ctx.restore();
  }

  private drawLightCone(lightScreenPos: ScreenPosition, facingAngle: number, zoom: number): void {
    if (!this.ctx) return;
    const coneLength = this.playerLightConeLen * zoom;
    const startWidth = GRID_CONFIG.TILE_SIZE * 1 * zoom;
    const endWidth = GRID_CONFIG.TILE_SIZE * 4.5 * zoom;

    this.ctx.save();
    this.ctx.translate(lightScreenPos.x, lightScreenPos.y);
    this.ctx.rotate(facingAngle);

    const gradient = this.ctx.createLinearGradient(0, 0, coneLength, 0);
    gradient.addColorStop(0, `rgba(0, 0, 0, ${this.nightOverlayAlpha})`);
    gradient.addColorStop(0.6, `rgba(0, 0, 0, ${this.nightOverlayAlpha})`);
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

    this.ctx.globalCompositeOperation = "destination-out";
    this.ctx.fillStyle = gradient;

    this.ctx.beginPath();
    this.ctx.moveTo(0, -startWidth / 2);
    this.ctx.lineTo(coneLength, -endWidth / 2);
    this.ctx.lineTo(coneLength, endWidth / 2);
    this.ctx.lineTo(0, startWidth / 2);
    this.ctx.closePath();

    this.ctx.fill();
    this.ctx.globalCompositeOperation = "source-over";
    this.ctx.restore();
  }

  private drawBlocksShadow(playerScreen: ScreenPosition, blocks: Map<number, ABlock>, zoom: number): void {
    const levelGrid = this.gameInstance.MANAGERS.LevelManager.levelGrid;
    const shadowLength = GRID_CONFIG.TILE_SIZE * 8 * zoom;

    if (!this.shadowCtx || !levelGrid) return;

    for (const block of blocks.values()) {
      if (!this.gameInstance.MANAGERS.CameraManager.isOnScreen(block.worldPos)) continue;
      this.drawEdgeShadows(block.gridPos, playerScreen, shadowLength);
    }

    this.shadowCtx.save();
    this.shadowCtx.globalCompositeOperation = "destination-out";
    for (const block of blocks.values()) block.drawMask(this.shadowCtx);
    this.shadowCtx.globalCompositeOperation = "source-over";
    this.shadowCtx.restore();
  }

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
