import { gameInstance } from "../main";

export enum ZIndex {
  GROUND = 0,
  BLOCKS = 100,
  ENTITIES = 200,
  EFFECTS = 300,
}

export interface DrawCommand {
  image: HTMLImageElement;
  x: number;
  y: number;
  width: number;
  height: number;
  /** radians */
  rotation?: number;
  alpha?: number;
  zIndex: number;
}

export default class DrawManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private drawQueue: Record<number, DrawCommand[]> = {};
  private rafId: number | null = null;
  private isRunning: boolean = false;

  private lastFrameTime: number = 0;
  private fps: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get 2D context from canvas");
    this.ctx = ctx;

    window.addEventListener("resize", this.updateCanvasSize.bind(this));
  }

  // Canvas

  private updateCanvasSize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    gameInstance.MANAGERS.CameraManager.setViewportSize(
      this.canvas.width,
      this.canvas.height,
    );
  }

  private clearCanvas(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  // Render loop

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

    const deltaTime = (currentTime - this.lastFrameTime) / 1000;
    this.lastFrameTime = currentTime;
    this.fps = Math.round(1 / deltaTime);

    this.clearCanvas();
    gameInstance.update(deltaTime);
    this.renderDrawQueue();
    gameInstance.MANAGERS.UIManager.drawFps(this.fps);

    this.rafId = requestAnimationFrame(this.renderLoop.bind(this));
  }

  // Draw queue

  private renderDrawQueue(): void {
    Object.entries(this.drawQueue).sort(([a], [b]) => Number(a) - Number(b)).forEach(([_zIndex, commands]) => {
      for (const cmd of commands) {
        this.drawCommand(cmd);
      }
    })

    this.drawQueue = {}
  }

  private drawCommand(cmd: DrawCommand): void {
    this.ctx.save();

    if (cmd.alpha !== undefined) this.ctx.globalAlpha = cmd.alpha;

    if (cmd.rotation !== undefined && cmd.rotation !== 0) {
      this.ctx.translate(cmd.x + cmd.width / 2, cmd.y + cmd.height / 2);
      this.ctx.rotate(cmd.rotation);
      this.ctx.drawImage(
        cmd.image,
        -cmd.width / 2,
        -cmd.height / 2,
        cmd.width,
        cmd.height,
      );
    } else {
      this.ctx.drawImage(cmd.image, cmd.x, cmd.y, cmd.width, cmd.height);
    }

    this.ctx.restore();
  }

  // Drawing methods

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
    const camera = gameInstance.MANAGERS.CameraManager;
    const screenPos = camera.worldToScreen({ x: worldX, y: worldY });

    if (!camera.isOnScreen({ x: worldX, y: worldY }, Math.max(width, height)))
      return;

    const queue = this.drawQueue[zIndex] ?? [];
    queue.push({
      image,
      x: screenPos.x - width / 2,
      y: screenPos.y - height / 2,
      width,
      height,
      rotation,
      alpha,
      zIndex,
    })
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
    this.ctx.save();
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;
    this.ctx.strokeRect(x, y, width, height);
    this.ctx.restore();
  }

  // Maintenance

  public getSize(): { width: number; height: number } {
    return { width: this.canvas.width, height: this.canvas.height };
  }

  public destroy(): void {
    this.stopRenderLoop();
    window.removeEventListener("resize", this.updateCanvasSize);
  }
}
