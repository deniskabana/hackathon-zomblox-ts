import type { WorldPosition } from "../config/gameGrid";
import { gameInstance } from "../main";

export default class InputManager {
  public mouseWorldPos: WorldPosition = { x: 0, y: 0 };
  private keysPressed: Set<string> = new Set();

  constructor() {
    document.addEventListener('mousemove', this.onMouseMove.bind(this));
    document.addEventListener('keydown', this.onKeyDown.bind(this));
    document.addEventListener('keyup', this.onKeyUp.bind(this));
  }

  private onMouseMove(event: MouseEvent): void {
    this.updateMousePosition(event);
  }

  private onKeyDown(event: KeyboardEvent): void {
    this.keysPressed.add(event.code);
  }

  private onKeyUp(event: KeyboardEvent): void {
    this.keysPressed.delete(event.code);
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

  public isKeyDown(key: string): boolean {
    return this.keysPressed.has(key);
  }

  public destroy(): void {
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
  }
}
