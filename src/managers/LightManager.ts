import { GRID_CONFIG, type WorldPosition } from "../config/gameGrid";
import type GameInstance from "../GameInstance";
import { AManager } from "./abstract/AManager";

export default class LightManager extends AManager {
  private lightMaskCanvas: HTMLCanvasElement | undefined;
  private ctx: CanvasRenderingContext2D | undefined;

  private readonly nightOverlayAlpha = 0.85;
  private readonly playerLightRadius = GRID_CONFIG.TILE_SIZE * 3;
  private readonly playerLightConeLen = GRID_CONFIG.TILE_SIZE * 8;

  constructor(gameInstance: GameInstance) {
    super(gameInstance);
  }

  public init(): void {
    this.lightMaskCanvas = document.createElement("canvas");

    window.addEventListener("resize", this.updateCanvasSize);
    this.updateCanvasSize();

    const ctx = this.lightMaskCanvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get 2D context from canvas");
    this.ctx = ctx;
  }

  public destroy(): void {
    window.removeEventListener("resize", this.updateCanvasSize);
    this.lightMaskCanvas?.remove();
    this.lightMaskCanvas = undefined;
  }

  // Utils
  // ==================================================

  private updateCanvasSize(): void {
    if (!this.lightMaskCanvas) return;
    const dpr = window.devicePixelRatio || 1;
    const gameCanvas = this.gameInstance.canvas;

    this.lightMaskCanvas.style.width = gameCanvas.style.width;
    this.lightMaskCanvas.style.height = gameCanvas.style.height;

    this.lightMaskCanvas.width = gameCanvas.width;
    this.lightMaskCanvas.height = gameCanvas.height;
    this.ctx?.scale(dpr, dpr);
  }

  public drawNightLighting(playerWorldPos: WorldPosition, facingAngle: number): void {
    if (!this.ctx || !this.lightMaskCanvas) return;

    const { CameraManager, DrawManager } = this.gameInstance.MANAGERS;
    const playerScreenPos = CameraManager.worldToScreen(playerWorldPos);
    const zoom = CameraManager.zoom;

    this.ctx.save();
    this.ctx.globalCompositeOperation = "source-over";
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

    const gameCanvasCtx = DrawManager.getContext();
    if (!gameCanvasCtx) return;

    gameCanvasCtx.globalAlpha = this.nightOverlayAlpha;
    gameCanvasCtx.drawImage(
      this.lightMaskCanvas,
      0,
      0,
      this.lightMaskCanvas.width * zoom,
      this.lightMaskCanvas.height * zoom,
    );
    gameCanvasCtx.restore();
  }

  private drawLightCone(playerScreen: WorldPosition, facingAngle: number, zoom: number): void {
    if (!this.ctx) return;
    const coneLength = this.playerLightConeLen * zoom;
    const coneWidth = Math.PI / 3; // 60 degrees

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
}
