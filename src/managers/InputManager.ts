import type { WorldPosition } from "../config/gameGrid";
import { gameInstance } from "../main";

export default class InputManager {
  public mouseWorldPos: WorldPosition = { x: 0, y: 0 };

  constructor() {
    document.addEventListener('mousemove', this.onMouseMove.bind(this));
  }

  private onMouseMove(event: MouseEvent): void {
    this.updateMousePosition(event);
  }

  private updateMousePosition(event: MouseEvent): void {
    const rect = gameInstance.canvas.getBoundingClientRect();
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;

    const worldPos = gameInstance.MANAGERS.CameraManager.screenToWorld({
      x: screenX,
      y: screenY,
    });

    this.mouseWorldPos.x = worldPos.x;
    this.mouseWorldPos.y = worldPos.y;
  }

  public destroy(): void {
    document.removeEventListener('mousemove', this.onMouseMove);
  }
}
