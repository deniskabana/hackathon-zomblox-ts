import { gameInstance } from "../main";

export interface ScreenPosition {
  x: number;
  y: number;
}

export default class InputManager {
  public mouseScreenPos: ScreenPosition = { x: 0, y: 0 };
  private isMousePressed: boolean = false;
  private keysPressed: Set<string> = new Set();

  constructor() {
    document.addEventListener("mousedown", this.onMouseDown.bind(this));
    document.addEventListener("mouseup", this.onMouseUp.bind(this));
    document.addEventListener("mousemove", this.onMouseMove.bind(this));
    document.addEventListener("keydown", this.onKeyDown.bind(this));
    document.addEventListener("keyup", this.onKeyUp.bind(this));
    document.addEventListener("keypress", this.onKeyPress.bind(this));
  }

  private onMouseDown(): void {
    this.isMousePressed = true;
  }

  private onMouseUp(): void {
    this.isMousePressed = false;
  }

  private onMouseMove(event: MouseEvent): void {
    this.updateMousePosition(event);
  }

  private onKeyDown(event: KeyboardEvent): void {
    event.preventDefault();
    this.keysPressed.add(event.code);
  }

  private onKeyUp(event: KeyboardEvent): void {
    event.preventDefault();
    this.keysPressed.delete(event.code);
  }

  private onKeyPress(event: KeyboardEvent): void {
    event.preventDefault();
  }

  private updateMousePosition(event: MouseEvent): void {
    const rect = gameInstance.canvas.getBoundingClientRect();
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;
    this.mouseScreenPos.x = screenX;
    this.mouseScreenPos.y = screenY;
  }

  public isKeyDown(key: string): boolean {
    return this.keysPressed.has(key);
  }

  public isMouseDown(): boolean {
    return this.isMousePressed;
  }

  public destroy(): void {
    document.removeEventListener("mousedown", this.onMouseDown);
    document.removeEventListener("mouseup", this.onMouseUp);
    document.removeEventListener("mousemove", this.onMouseMove);
    document.removeEventListener("keydown", this.onKeyDown);
    document.removeEventListener("keyup", this.onKeyUp);
  }
}
