import { GRID_CONFIG, type WorldPosition } from "../config/gameGrid";
import type GameInstance from "../GameInstance";
import type { ScreenPosition } from "../types/ScreenPosition";
import { AManager } from "./abstract/AManager";

export default class LightManager extends AManager {
  private lightMaskCanvas: HTMLCanvasElement | undefined;
  private ctx: CanvasRenderingContext2D | undefined;

  private readonly nightOverlayAlpha = 1;
  private readonly playerLightRadius = 3.4;
  private readonly playerLightConeLen = GRID_CONFIG.TILE_SIZE * 9;

  private lightSourceIdCount: number = 0;
  private lightSources: Map<number, WorldPosition> = new Map();
  private readonly lightSourceRadius = 4.5;

  constructor(gameInstance: GameInstance) {
    super(gameInstance);
  }

  public init(): void {
    this.lightMaskCanvas = document.createElement("canvas");

    const ctx = this.lightMaskCanvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get 2D context from canvas");
    this.ctx = ctx;
  }

  public destroy(): void {
    this.lightMaskCanvas?.remove();
    this.lightMaskCanvas = undefined;
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
    if (!this.lightMaskCanvas) return;
    const gameCanvas = this.gameInstance.canvas;

    this.lightMaskCanvas.style.width = gameCanvas.style.width;
    this.lightMaskCanvas.style.height = gameCanvas.style.height;

    this.lightMaskCanvas.width = gameCanvas.width;
    this.lightMaskCanvas.height = gameCanvas.height;
  }

  /**
   * Draws a lightning radius around the player
   */
  public drawNightLighting(players: WorldPosition[], facingAngle: number): void {
    const { CameraManager, DrawManager } = this.gameInstance.MANAGERS;
    const zoom = CameraManager.zoom;
    if (!this.ctx || !this.lightMaskCanvas) return;

    this.ctx.clearRect(0, 0, this.lightMaskCanvas.width, this.lightMaskCanvas.height);

    this.ctx.save();
    this.ctx.fillStyle = "#000000";
    this.ctx.fillRect(0, 0, this.lightMaskCanvas.width, this.lightMaskCanvas.height);
    this.ctx.restore();

    for (const player of players) {
      const lightScreenPos = CameraManager.worldToScreen(player);
      this.drawRadialLight(lightScreenPos, this.playerLightRadius);
      this.drawLightCone(lightScreenPos, facingAngle, zoom);
    }

    for (const lightSource of this.lightSources.values()) {
      const lightScreenPos = CameraManager.worldToScreen({
        x: lightSource.x + GRID_CONFIG.TILE_SIZE / 2,
        y: lightSource.y + GRID_CONFIG.TILE_SIZE / 2,
      });
      this.drawRadialLight(lightScreenPos, this.lightSourceRadius);
    }

    const gameCanvasCtx = DrawManager.getContext();
    if (!gameCanvasCtx) return;
    gameCanvasCtx.save();
    gameCanvasCtx.globalAlpha = this.nightOverlayAlpha;
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
    const startWidth = GRID_CONFIG.TILE_SIZE * 1.5 * zoom;
    const endWidth = GRID_CONFIG.TILE_SIZE * 5.5 * zoom;

    this.ctx.save();
    this.ctx.translate(lightScreenPos.x, lightScreenPos.y);
    this.ctx.rotate(facingAngle);

    const gradient = this.ctx.createLinearGradient(0, 0, coneLength, 0);
    gradient.addColorStop(0, `rgba(0, 0, 0, ${this.nightOverlayAlpha})`);
    gradient.addColorStop(0.2, `rgba(0, 0, 0, ${this.nightOverlayAlpha})`);
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
}
