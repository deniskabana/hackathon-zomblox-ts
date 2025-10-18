import type GameInstance from "../GameInstance";
import type { ScreenPosition } from "../types/ScreenPosition";
import { AManager } from "./abstract/AManager";

// TODO: Implement input controls
export default class InputManager extends AManager {
  // Mouse
  public mouseScreenPos: ScreenPosition = { x: 0, y: 0 };
  private isMousePressed: boolean = false;

  // Keys / touch
  private keysPressed: Set<string> = new Set();

  constructor(gameInstance: GameInstance) {
    super(gameInstance);

    document.addEventListener("mousedown", this.onMouseDown.bind(this));
    document.addEventListener("mouseup", this.onMouseUp.bind(this));
    document.addEventListener("mousemove", this.onMouseMove.bind(this));

    document.addEventListener("touchstart", this.genericPreventDefault.bind(this));
    document.addEventListener("touchmove", this.genericPreventDefault.bind(this));
    document.addEventListener("touchend", this.genericPreventDefault.bind(this));
    document.addEventListener("touchcancel", this.genericPreventDefault.bind(this));

    document.addEventListener("keydown", this.onKeyDown.bind(this));
    document.addEventListener("keyup", this.onKeyUp.bind(this));
    document.addEventListener("keypress", this.onKeyPress.bind(this));

    window.addEventListener("scroll", (e) => e.preventDefault());
  }

  public init(): void {}

  // Event handles
  // --------------------------------------------------

  private genericPreventDefault(event: Event): void {
    event.preventDefault();
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

  public onKeyDown(event: KeyboardEvent): void {
    event.preventDefault();
    this.keysPressed.add(event.code);
  }

  public onKeyUp(event: KeyboardEvent): void {
    event.preventDefault();
    this.keysPressed.delete(event.code);
  }

  public onKeyPress(event: KeyboardEvent): void {
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
    document.removeEventListener("touchstart", this.genericPreventDefault);
    document.removeEventListener("touchmove", this.genericPreventDefault);
    document.removeEventListener("touchend", this.genericPreventDefault);
    document.removeEventListener("touchcancel", this.genericPreventDefault);
  }
}
