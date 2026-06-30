import { GRID_CONFIG, type WorldPosition } from "../../config/core/grid.config";
import type GameInstance from "../../GameInstance";
import lerp from "../../utils/math/lerp";
import { AManager } from "../abstract/AManager";

export default class CameraManager extends AManager {
  private _x: number = 0;
  private _y: number = 0;
  private _shakeOffsetX: number = 0;
  private _shakeOffsetY: number = 0;

  public x: number = 0;
  public y: number = 0;

  public viewportWidth: number = window.innerWidth;
  public viewportHeight: number = window.innerHeight;

  public zoom: number = 1;
  private targetZoom: number = 1;
  private zoomScale: number = 1;
  private targetWorldWidth: number = 1000;
  private followSpeed: number = 2;

  constructor(gameInstance: GameInstance) {
    super(gameInstance);
  }

  public _init(): void {
    window.addEventListener("resize", this.onResize);
    this.onResize();
  }

  public update(_deltaTime: number): void {
    this.calculateZoom();
    this._shakeOffsetX = lerp(this._shakeOffsetX, 0, _deltaTime * 12);
    this._shakeOffsetY = lerp(this._shakeOffsetY, 0, _deltaTime * 12);

    this.x = this._x + this._shakeOffsetX;
    this.y = this._y + this._shakeOffsetY;
  }

  private onResize = (): void => {
    this.setViewportSize();
    this.calculateZoom();
  };

  private calculateZoom(): void {
    this.targetZoom = (this.viewportWidth / this.targetWorldWidth) * this.zoomScale;
    this.zoom = Math.floor(this.targetZoom * 10) / 10;
  }

  public followPlayer(_deltaTime: number, playerPos: WorldPosition): void {
    const levelManager = this.gameInstance.MANAGERS.LevelManager;

    if (Math.abs(this._x - playerPos.x) < 0.1) {
      this._x = playerPos.x;
    } else {
      this._x = Math.round(lerp(this._x, playerPos.x, _deltaTime * this.followSpeed) * 10) / 10;
    }

    if (Math.abs(this._y - playerPos.y) < 0.1) {
      this._y = playerPos.y;
    } else {
      this._y = Math.round(lerp(this._y, playerPos.y, _deltaTime * this.followSpeed) * 10) / 10;
    }

    const halfViewWidth = this.viewportWidth / 2 / this.zoom;
    const halfViewHeight = this.viewportHeight / 2 / this.zoom;
    const threshold = GRID_CONFIG.TILE_SIZE * -1;

    const minX = halfViewWidth - threshold;
    const maxX = levelManager.worldWidth - halfViewWidth + threshold;
    const minY = halfViewHeight - threshold;
    const maxY = levelManager.worldHeight - halfViewHeight + threshold;

    if (this._x < minX) this._x = minX;
    else if (this._x > maxX) this._x = maxX;
    if (this._y < minY) this._y = minY;
    else if (this._y > maxY) this._y = maxY;
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

  public effectZoom(strength: number = 5) {
    this.zoom -= (Math.abs(this.zoom - this.targetZoom) / 30) * strength;
  }

  public effectShake(strength: number): void {
    this._shakeOffsetX = (Math.random() - 0.5) * strength;
    this._shakeOffsetY = (Math.random() - 0.5) * strength;
  }

  public setViewportSize(width?: number, height?: number): void {
    this.viewportWidth = width ?? window.innerWidth;
    this.viewportHeight = height ?? window.innerHeight;
    this.calculateZoom();
  }

  public _destroy(): void {
    window.removeEventListener("resize", this.onResize);
  }

  public getZoomScale(): number {
    return this.zoomScale;
  }
  public getFollowSpeed(): number {
    return this.followSpeed;
  }
  public getTargetWorldWidth(): number {
    return this.targetWorldWidth;
  }
  public getTargetWorldHeight(): number {
    return this.targetWorldWidth * (this.viewportHeight / this.viewportWidth);
  }
  public setZoomScale(zoom: number = 1) {
    this.zoomScale = zoom;
  }
  public setFollowSpeed(speed: number = 2) {
    this.followSpeed = speed;
  }
  public setTargetWorldWidth(width: number = 1300) {
    this.targetWorldWidth = width;
  }
}
