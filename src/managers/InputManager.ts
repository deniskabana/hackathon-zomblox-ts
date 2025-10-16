import type GameInstance from "../GameInstance";

export interface ScreenPosition {
  x: number;
  y: number;
}

// TODO: Implement input controls
export enum GameControl {
  MOVE_UP = "MOVE_UP",
  MOVE_DOWN = "MOVE_DOWN",
  MOVE_LEFT = "MOVE_LEFT",
  MOVE_RIGHT = "MOVE_RIGHT",
  SHOOT = "SHOOT",
  RELOAD = "RELOAD",
  PAUSE = "PAUSE",
  CHANGE_WEAPON = "CHANGE_WEAPON",
  BUILD_MENU = "BUILD_MENU",
}

export default class InputManager {
  private gameInstance: GameInstance;

  // Mouse
  public mouseScreenPos: ScreenPosition = { x: 0, y: 0 };
  private isMousePressed: boolean = false;

  // Keys / touch
  private keysPressed: Set<string> = new Set();

  constructor(gameInstance: GameInstance) {
    this.gameInstance = gameInstance;

    document.addEventListener("mousedown", this.onMouseDown.bind(this));
    document.addEventListener("mouseup", this.onMouseUp.bind(this));
    document.addEventListener("mousemove", this.onMouseMove.bind(this));

    document.addEventListener("keydown", this.onKeyDown.bind(this));
    document.addEventListener("keyup", this.onKeyUp.bind(this));
    document.addEventListener("keypress", this.onKeyPress.bind(this));
  }

  // Event handles
  // --------------------------------------------------

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

  // Utils
  // --------------------------------------------------

  private updateMousePosition(event: MouseEvent): void {
    const rect = this.gameInstance.canvas.getBoundingClientRect();
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
