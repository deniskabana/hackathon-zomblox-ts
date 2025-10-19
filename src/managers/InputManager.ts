import type GameInstance from "../GameInstance";
import { GameControls } from "../types/GameControls";
import type { ScreenPosition } from "../types/ScreenPosition";
import getDirectionalAngle from "../utils/math/getDirectionalAngle";
import { AManager } from "./abstract/AManager";

export default class InputManager extends AManager {
  private aimDirection: number = 0;
  private moveDirection: number | undefined;
  private controlsPressed: Set<GameControls> = new Set();

  private mouseScreenPos: ScreenPosition = { x: 0, y: 0 };

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

    document.body.addEventListener("scroll", this.genericPreventDefault.bind(this));
    document.addEventListener("selectstart", this.genericPreventDefault.bind(this));
    document.addEventListener("select", this.genericPreventDefault.bind(this));
  }

  public init(): void {}

  // Input Manager API
  // --------------------------------------------------

  public isControlDown(control: GameControls): boolean {
    return this.controlsPressed.has(control);
  }

  public getAimDirection(): number {
    return this.aimDirection;
  }

  public getMoveDirection(): number | undefined {
    return this.moveDirection;
  }

  public simulateControlPress(control: GameControls): void {
    this.controlsPressed.add(control);
  }

  public simulateControlRelease(control: GameControls): void {
    this.controlsPressed.delete(control);
  }

  public updateAimAngle(angle: number): void {
    this.aimDirection = angle;
  }

  // Event handlers
  // --------------------------------------------------

  private genericPreventDefault(event: Event): void {
    event.preventDefault();
  }

  private onMouseDown(): void {
    this.controlsPressed.add(GameControls.SHOOT);
  }

  private onMouseUp(): void {
    this.controlsPressed.delete(GameControls.SHOOT);
  }

  private onMouseMove(event: MouseEvent): void {
    this.updateMousePosition(event);
  }

  private onKeyDown(event: KeyboardEvent): void {
    event.preventDefault();
    const control = this.getGameControlByKeyCode(event.code);
    if (control) this.controlsPressed.add(control);
  }

  private onKeyUp(event: KeyboardEvent): void {
    event.preventDefault();
    const control = this.getGameControlByKeyCode(event.code);
    if (control) this.controlsPressed.delete(control);
  }

  private onKeyPress(event: KeyboardEvent): void {
    event.preventDefault();
  }

  private updateMousePosition(event: MouseEvent): void {
    const rect = this.gameInstance.canvas.getBoundingClientRect();
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;
    this.mouseScreenPos.x = screenX;
    this.mouseScreenPos.y = screenY;

    const player = this.gameInstance.MANAGERS.LevelManager.player;
    if (!player) return;
    const mouseWorldPos = this.gameInstance.MANAGERS.CameraManager.screenToWorld(this.mouseScreenPos);
    this.aimDirection = getDirectionalAngle(mouseWorldPos, player.worldPos);
  }

  private getGameControlByKeyCode(code: string): GameControls | undefined {
    let control: GameControls;

    switch (code) {
      case "KeyW":
      case "ArrowUp":
        control = GameControls.MOVE_UP;
        break;
      case "KeyA":
      case "ArrowLeft":
        control = GameControls.MOVE_LEFT;
        break;
      case "KeyS":
      case "ArrowDown":
        control = GameControls.MOVE_DOWN;
        break;
      case "KeyD":
      case "ArrowRight":
        control = GameControls.MOVE_RIGHT;
        break;

      case "Tab":
        control = GameControls.CHANGE_WEAPON;
        break;
      case "Escape":
      case "KeyP":
        control = GameControls.PAUSE;
        break;
      case "Space":
      case "KeyB":
        control = GameControls.BUILD_MENU;
        break;

      default:
        return;
    }

    return control;
  }

  // Utils
  // --------------------------------------------------

  public destroy(): void {
    document.removeEventListener("mousedown", this.onMouseDown);
    document.removeEventListener("mouseup", this.onMouseUp);
    document.removeEventListener("mousemove", this.onMouseMove);

    document.removeEventListener("touchstart", this.genericPreventDefault);
    document.removeEventListener("touchmove", this.genericPreventDefault);
    document.removeEventListener("touchend", this.genericPreventDefault);
    document.removeEventListener("touchcancel", this.genericPreventDefault);

    document.removeEventListener("keydown", this.onKeyDown);
    document.removeEventListener("keyup", this.onKeyUp);
    document.removeEventListener("keypress", this.onKeyPress);

    document.body.removeEventListener("scroll", this.genericPreventDefault);
    document.removeEventListener("selectstart", this.genericPreventDefault);
    document.removeEventListener("select", this.genericPreventDefault);
  }
}
