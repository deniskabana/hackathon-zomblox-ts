import { gameInstance } from "../main";

export interface DrawCommand {
  image: HTMLImageElement;
  x: number;
  y: number;
  width: number;
  height: number;
  /** radians */
  rotation?: number; // radians
  alpha?: number;
}

export default class DrawManager {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  private drawQueue: DrawCommand[] = [];
  private rafId: number | null = null;
  private isRunning: boolean = false;

  private lastFrameTime: number = 0;
  private fps: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context from canvas');
    this.ctx = ctx;

    window.addEventListener('resize', this.updateCanvasSize.bind(this));
  }

  private updateCanvasSize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    gameInstance.MANAGERS.CameraManager.setViewportSize(
      this.canvas.width,
      this.canvas.height,
    );
  }

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
    this.fps = 1 / deltaTime;

    this.clearCanvas();
    gameInstance.update(deltaTime);
    this.renderDrawQueue();

    this.rafId = requestAnimationFrame(this.renderLoop.bind(this));
  }

  private clearCanvas(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private renderDrawQueue(): void {
    for (const cmd of this.drawQueue) {
      this.drawCommand(cmd);
    }
    this.drawQueue = [];
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
        cmd.height
      );
    } else {
      this.ctx.drawImage(cmd.image, cmd.x, cmd.y, cmd.width, cmd.height);
    }

    this.ctx.restore();
  }

  public queueDraw(worldX: number, worldY: number, image: HTMLImageElement, width: number, height: number, rotation?: number, alpha?: number): void {
    const camera = gameInstance.MANAGERS.CameraManager;
    const screenPos = camera.worldToScreen({ x: worldX, y: worldY });

    if (!camera.isOnScreen({ x: worldX, y: worldY }, Math.max(width, height))) return;

    this.drawQueue.push({
      image,
      x: screenPos.x - width / 2,
      y: screenPos.y - height / 2,
      width,
      height,
      rotation,
      alpha,
    });
  }

  public drawRect(x: number, y: number, width: number, height: number, color: string, alpha: number = 1): void {
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, width, height);
    this.ctx.restore();
  }

  public drawRectOutline(x: number, y: number, width: number, height: number, color: string, lineWidth: number = 1): void {
    this.ctx.save();
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;
    this.ctx.strokeRect(x, y, width, height);
    this.ctx.restore();
  }

  public getFPS(): number {
    return Math.round(this.fps);
  }

  public getSize(): { width: number; height: number } {
    return { width: this.canvas.width, height: this.canvas.height };
  }

  public destroy(): void {
    this.stopRenderLoop();
    window.removeEventListener('resize', this.updateCanvasSize);
  }
}
