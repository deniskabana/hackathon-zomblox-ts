import { GRID_CONFIG, type WorldPosition } from "../config/core/grid.config";
import type GameInstance from "../GameInstance";
import type { ScreenPosition } from "../types/engine/ScreenPosition";
import lerp from "../utils/math/lerp";
import radialLerp from "../utils/math/radialLerp";
import { AManager } from "./abstract/AManager";

export default class LightManager extends AManager {
  private lightMaskCanvas: HTMLCanvasElement | undefined;
  private ctx: CanvasRenderingContext2D | undefined;

  private nightOverlayAlpha = 1;
  private playerLightRadius = 4;
  private readonly playerLightConeLen = GRID_CONFIG.TILE_SIZE * 14;

  private lightSourceIdCount: number = 0;
  private lightSources: Map<number, { pos: WorldPosition; strength: number; alpha: number }> = new Map();

  constructor(gameInstance: GameInstance) {
    super(gameInstance);
  }

  public _init(): void {
    this.lightMaskCanvas = document.createElement("canvas");

    const ctx = this.lightMaskCanvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get 2D context from canvas");
    this.ctx = ctx;
  }

  public _destroy(): void {
    this.lightMaskCanvas?.remove();
    this.lightMaskCanvas = undefined;
    this.lightSources.clear();
  }

  // Utils
  // ==================================================

  public addLightSource(pos: WorldPosition, strength: number = 1, alpha: number = 1): number {
    const id = ++this.lightSourceIdCount;
    this.lightSources.set(id, { pos, strength, alpha });
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
    const { CameraManager, DrawManager, SettingsManager } = this.gameInstance.MANAGERS;
    const allSettings = SettingsManager.getSettings();
    this.playerLightRadius = allSettings.player.lightRadius;
    this.nightOverlayAlpha = allSettings.rules.nightOverlayAlpha;

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
        x: lightSource.pos.x + GRID_CONFIG.TILE_SIZE / 2,
        y: lightSource.pos.y + GRID_CONFIG.TILE_SIZE / 2,
      });
      this.drawRadialLight(lightScreenPos, lightSource.strength, lightSource.alpha);
    }

    const gameCanvasCtx = DrawManager.getContext();
    if (!gameCanvasCtx) return;
    gameCanvasCtx.save();
    gameCanvasCtx.globalAlpha = SettingsManager.getSettings().rules.debugSeeThroughNight
      ? 0.25
      : this.nightOverlayAlpha;
    gameCanvasCtx.drawImage(this.lightMaskCanvas, 0, 0, this.lightMaskCanvas.width, this.lightMaskCanvas.height);
    gameCanvasCtx.restore();
  }

  private drawRadialLight(lightScreenPos: ScreenPosition, strength: number = 1, alpha: number = 1): void {
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
    gradient.addColorStop(0, `rgba(0, 0, 0, ${alpha})`);
    gradient.addColorStop(0.2, `rgba(0, 0, 0, ${alpha})`);
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

    this.ctx.globalCompositeOperation = "destination-out";
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(lightScreenPos.x - lightRadius, lightScreenPos.y - lightRadius, lightRadius * 2, lightRadius * 2);
    this.ctx.globalCompositeOperation = "source-over";
    this.ctx.restore();
  }

  private _facingAngle: number = -1;

  private drawLightCone(lightScreenPos: ScreenPosition, facingAngle: number, zoom: number): void {
    if (!this.ctx) return;
    const coneLength = this.playerLightConeLen * zoom;
    const startWidth = GRID_CONFIG.TILE_SIZE * 2 * zoom;
    const endWidth = GRID_CONFIG.TILE_SIZE * 9 * zoom;

    this.ctx.save();
    this.ctx.translate(lightScreenPos.x, lightScreenPos.y);
    this._facingAngle = radialLerp(this._facingAngle, facingAngle, 0.4);
    this.ctx.rotate(this._facingAngle);

    const gradient = this.ctx.createLinearGradient(0, 0, coneLength, 0);
    gradient.addColorStop(0, `rgba(0, 0, 0, ${this.nightOverlayAlpha})`);
    gradient.addColorStop(0.25, `rgba(0, 0, 0, ${this.nightOverlayAlpha})`);
    gradient.addColorStop(0.85, "rgba(0, 0, 0, 0)");

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
