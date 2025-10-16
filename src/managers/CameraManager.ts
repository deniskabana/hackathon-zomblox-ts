import type { WorldPosition } from "../config/gameGrid";
import type GameInstance from "../GameInstance";
import { AManager } from "./abstract/AManager";

// TODO: Zoom. Needed afterall, lol
export default class CameraManager extends AManager {
  public x: number = 0;
  public y: number = 0;

  public viewportWidth: number;
  public viewportHeight: number;

  constructor(gameInstance: GameInstance) {
    super(gameInstance);
    this.viewportWidth = window.innerWidth;
    this.viewportHeight = window.innerHeight;
  }

  public init(): void {}

  public followPlayer(playerPos: WorldPosition): void {
    const levelManager = this.gameInstance.MANAGERS.LevelManager;

    this.x = playerPos.x;
    this.y = playerPos.y;

    const halfViewWidth = this.viewportWidth / 2;
    const halfViewHeight = this.viewportHeight / 2;

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
      x: worldPos.x - this.x + this.viewportWidth / 2,
      y: worldPos.y - this.y + this.viewportHeight / 2,
    };
  }

  public screenToWorld(screenPos: WorldPosition): WorldPosition {
    return {
      x: screenPos.x + this.x - this.viewportWidth / 2,
      y: screenPos.y + this.y - this.viewportHeight / 2,
    };
  }

  public isOnScreen(worldPos: WorldPosition, margin: number = 100): boolean {
    const screen = this.worldToScreen(worldPos);
    return (
      screen.x >= -margin &&
      screen.x <= this.viewportWidth + margin &&
      screen.y >= -margin &&
      screen.y <= this.viewportHeight + margin
    );
  }

  public setViewportSize(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;
  }

  public destroy(): void {}
}
