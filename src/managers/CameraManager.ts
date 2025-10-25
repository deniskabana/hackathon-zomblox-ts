import type { WorldPosition } from "../config/gameGrid";
import type GameInstance from "../GameInstance";
import { clamp } from "../utils/math/clamp";
import lerp from "../utils/math/lerp";
import { AManager } from "./abstract/AManager";

export default class CameraManager extends AManager {
  public x: number = 0;
  public y: number = 0;

  public viewportWidth: number = window.innerWidth;
  public viewportHeight: number = window.innerHeight;

  public zoom: number = 1;
  private targetZoom: number = 1;

  private readonly minZoom: number = 0.5;
  private readonly maxZoom: number = 2;

  private readonly targetWorldWidth: number = 768;
  private readonly playerFollowSpeed = 0.2;

  constructor(gameInstance: GameInstance) {
    super(gameInstance);
  }

  public init(): void {
    window.addEventListener("resize", this.onResize);
    this.onResize();
  }

  public update(_deltaTime: number): void {
    if (this.zoom !== this.targetZoom)
      this.zoom = Math.round(lerp(this.zoom, this.targetZoom, _deltaTime * 9) * 100) / 100;
  }

  private onResize = (): void => {
    this.setViewportSize();
    this.calculateZoom();
  };

  private calculateZoom(): void {
    const idealZoom = this.viewportWidth / this.targetWorldWidth;
    this.targetZoom = clamp(this.minZoom, idealZoom, this.maxZoom);
  }

  public followPlayer(_deltaTime: number, playerPos: WorldPosition): void {
    const levelManager = this.gameInstance.MANAGERS.LevelManager;

    this.x = lerp(playerPos.x, this.x, (_deltaTime * this.playerFollowSpeed) / 10);
    this.y = lerp(playerPos.y, this.y, (_deltaTime * this.playerFollowSpeed) / 10);

    const halfViewWidth = this.viewportWidth / 2 / this.zoom;
    const halfViewHeight = this.viewportHeight / 2 / this.zoom;

    if (this.x - halfViewWidth < 0) {
      this.x = halfViewWidth;
    } else if (this.x + halfViewWidth > levelManager.worldWidth) {
      this.x = levelManager.worldWidth - halfViewWidth;
    }

    if (this.y - halfViewHeight < 0) {
      this.y = halfViewHeight;
    } else if (this.y + halfViewHeight > levelManager.worldHeight) {
      this.y = levelManager.worldHeight - halfViewHeight;
    }
  }

  public worldToScreen(worldPos: WorldPosition): WorldPosition {
    return {
      x: (worldPos.x - this.x) * this.zoom + this.viewportWidth / 2,
      y: (worldPos.y - this.y) * this.zoom + this.viewportHeight / 2,
    };
  }

  public screenToWorld(screenPos: WorldPosition): WorldPosition {
    return {
      x: (screenPos.x - this.viewportWidth / 2) / this.zoom + this.x,
      y: (screenPos.y - this.viewportHeight / 2) / this.zoom + this.y,
    };
  }

  public isOnScreen(worldPos: WorldPosition, margin: number = 100): boolean {
    const zoomedMargin = margin * this.zoom;
    const screen = this.worldToScreen(worldPos);
    return (
      screen.x >= -zoomedMargin &&
      screen.x <= this.viewportWidth + zoomedMargin &&
      screen.y >= -zoomedMargin &&
      screen.y <= this.viewportHeight + zoomedMargin
    );
  }

  public setViewportSize(width?: number, height?: number): void {
    this.viewportWidth = width ?? window.innerWidth;
    this.viewportHeight = height ?? window.innerHeight;
    this.calculateZoom();
  }

  public destroy(): void {
    window.removeEventListener("resize", this.onResize);
  }
}
