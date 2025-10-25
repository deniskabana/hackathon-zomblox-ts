import type GameInstance from "../GameInstance";
import type { DrawCommand } from "../types/DrawCommand";
import { ZIndex } from "../types/ZIndex";
import { AManager } from "./abstract/AManager";

export default class DrawManager extends AManager {
  private canvas: HTMLCanvasElement;
  private ctx?: CanvasRenderingContext2D;

  private drawQueue: Record<number, DrawCommand[]> = {};
  private rafId: number | null = null;
  private isRunning: boolean = false;

  private lastFrameTime: number = 0;
  private fps: number = 0;

  private readonly MIN_ASPECT = 16 / 10;
  private readonly MAX_ASPECT = 32 / 9;
  private constrainedHeight: number = 0;

  private canvasUpdateTimer: number = 0;
  private readonly canvasUpdateInterval: number = 0.2;

  constructor(gameInstance: GameInstance, canvas: HTMLCanvasElement) {
    super(gameInstance);
    this.canvas = canvas;
  }

  public init(): void {
    window.addEventListener("resize", this.updateCanvasSize.bind(this));

    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get 2D context from canvas");
    this.ctx = ctx;
  }

  // Canvas
  // ==================================================

  public getSize(): { width: number; height: number } {
    return { width: this.canvas.width, height: this.canvas.height };
  }

  private updateCanvasSize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const actualAspect = width / height;
    const dpr = window.devicePixelRatio || 1;

    if (actualAspect > this.MAX_ASPECT) {
      this.constrainedHeight = Math.floor(width / this.MAX_ASPECT);
    } else if (actualAspect < this.MIN_ASPECT) {
      this.constrainedHeight = Math.floor(width / this.MIN_ASPECT);
    } else {
      this.constrainedHeight = height;
    }

    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${this.constrainedHeight}px`;

    this.canvas.width = width * dpr;
    this.canvas.height = this.constrainedHeight * dpr;
    this.ctx?.scale(dpr, dpr);

    const { uiContainer } = this.gameInstance.MANAGERS.UIManager;
    uiContainer.style.width = this.canvas.style.width;
    uiContainer.style.height = this.canvas.style.height;
    uiContainer.style.top = `${(window.innerHeight - this.constrainedHeight) / 2}px`;

    this.gameInstance.MANAGERS.CameraManager.setViewportSize(width, this.constrainedHeight);
  }

  private clearCanvas(): void {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  // Render loop
  // ==================================================

  public startRenderLoop(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.rafId = requestAnimationFrame(this.renderLoop.bind(this));
  }

  public stopRenderLoop(): void {
    this.isRunning = false;

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private renderLoop(currentTime: number): void {
    if (!this.isRunning) return;
    const { BuildModeManager, UIManager, VFXManager, LevelManager } = this.gameInstance.MANAGERS;

    const deltaTime = (currentTime - this.lastFrameTime) / 1000;
    this.lastFrameTime = currentTime;
    this.fps = Math.round(1 / deltaTime);

    if (this.canvasUpdateTimer > 0) {
      this.canvasUpdateTimer -= deltaTime;
    } else {
      this.canvasUpdateTimer = this.canvasUpdateInterval;
      this.updateCanvasSize();
    }

    this.clearCanvas();
    this.gameInstance.update(deltaTime); // This could be decoupled
    this.renderDrawQueue();
    UIManager.draw(this.fps);
    VFXManager.draw(deltaTime);
    LevelManager.drawEntities();
    BuildModeManager.draw();

    this.rafId = requestAnimationFrame(this.renderLoop.bind(this));
  }

  // Draw queue
  // ==================================================

  private renderDrawQueue(): void {
    Object.entries(this.drawQueue)
      .sort(([a], [b]) => Number(a) - Number(b))
      .forEach(([_zIndex, commands]) => {
        for (const cmd of commands) {
          this.drawCommand(cmd);
        }
      });

    this.drawQueue = {};
  }

  private drawCommand(cmd: DrawCommand): void {
    if (!this.ctx) return;
    this.ctx.save();

    const { CameraManager } = this.gameInstance.MANAGERS;
    const width = cmd.width * CameraManager.zoom;
    const height = cmd.width * CameraManager.zoom;

    if (cmd.alpha !== undefined) this.ctx.globalAlpha = cmd.alpha;

    if (cmd.rotation !== undefined && cmd.rotation !== 0) {
      this.ctx.translate(cmd.x + width / 2, cmd.y + height / 2);
      this.ctx.rotate(cmd.rotation);
      this.ctx.drawImage(cmd.image, -width / 2, -height / 2, width, height);
    } else {
      this.ctx.drawImage(cmd.image, cmd.x, cmd.y, width, height);
    }

    this.ctx.restore();
  }

  // Direct draw methods
  // ==================================================

  public queueDraw(
    worldX: number,
    worldY: number,
    image: HTMLImageElement,
    width: number,
    height: number,
    zIndex: number = ZIndex.ENTITIES,
    rotation?: number,
    alpha?: number,
  ): void {
    const { CameraManager } = this.gameInstance.MANAGERS;
    const screenPos = CameraManager.worldToScreen({ x: worldX, y: worldY });
    if (!CameraManager.isOnScreen({ x: worldX, y: worldY }, Math.max(width, height))) return;

    const queue = this.drawQueue[zIndex] ?? [];
    queue.push({
      image,
      x: screenPos.x,
      y: screenPos.y,
      width,
      height,
      rotation,
      alpha,
      zIndex,
    });
    this.drawQueue[zIndex] = queue;
  }

  public drawRectOutline(
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
    lineWidth: number = 1,
  ): void {
    if (!this.ctx) return;
    const { CameraManager } = this.gameInstance.MANAGERS;

    this.ctx.save();
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth * CameraManager.zoom;
    const screenPos = this.gameInstance.MANAGERS.CameraManager.worldToScreen({ x, y });
    this.ctx.strokeRect(screenPos.x, screenPos.y, width * CameraManager.zoom, height * CameraManager.zoom);
    this.ctx.restore();
  }

  public drawRectFilled(x: number, y: number, width: number, height: number, color: string): void {
    if (!this.ctx) return;
    const { CameraManager } = this.gameInstance.MANAGERS;

    this.ctx.save();
    this.ctx.fillStyle = color;
    const screenPos = this.gameInstance.MANAGERS.CameraManager.worldToScreen({ x, y });
    this.ctx.fillRect(screenPos.x, screenPos.y, width * CameraManager.zoom, height * CameraManager.zoom);
    this.ctx.restore();
  }

  public drawLine(x1: number, y1: number, x2: number, y2: number, color: string, lineWidth: number = 1): void {
    if (!this.ctx) return;
    const { CameraManager } = this.gameInstance.MANAGERS;

    this.ctx.save();
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = Math.max(1, lineWidth * CameraManager.zoom);
    this.ctx.beginPath();
    const screenPos1 = CameraManager.worldToScreen({ x: x1, y: y1 });
    this.ctx.moveTo(screenPos1.x, screenPos1.y);
    const screenPos2 = CameraManager.worldToScreen({ x: x2, y: y2 });
    this.ctx.lineTo(screenPos2.x, screenPos2.y);
    this.ctx.closePath();
    this.ctx.stroke();
    this.ctx.restore();
  }

  public drawText(
    text: string,
    x: number,
    y: number,
    color: string = "#ffffff",
    fontSize: number = 16,
    fontFamily: string = "Arial",
    align: CanvasTextAlign = "left",
  ): void {
    if (!this.ctx) return;
    const { CameraManager } = this.gameInstance.MANAGERS;

    this.ctx.save();
    this.ctx.fillStyle = color;
    this.ctx.font = `${fontSize * CameraManager.zoom}px ${fontFamily}`;
    this.ctx.textAlign = align;
    const screenPos = this.gameInstance.MANAGERS.CameraManager.worldToScreen({ x, y });
    this.ctx.fillText(text, screenPos.x, screenPos.y);
    this.ctx.restore();
  }

  // Utils
  // ==================================================

  public destroy(): void {
    this.stopRenderLoop();
    window.removeEventListener("resize", this.updateCanvasSize.bind(this));

    this.drawQueue = {};
    this.lastFrameTime = 0;
    this.fps = 0;
  }
}
