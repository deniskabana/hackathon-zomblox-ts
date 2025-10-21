import type GameInstance from "../GameInstance";
import { GameControls } from "../types/GameControls";
import type { ScreenPosition } from "../types/ScreenPosition";
import getDirectionalAngle from "../utils/math/getDirectionalAngle";
import { AManager } from "./abstract/AManager";
import styles from "../styles/uiControls.module.css";
import getVectorDistance from "../utils/math/getVectorDistance";
import radiansToVector from "../utils/math/radiansToVector";

export default class InputManager extends AManager {
  private aimDirection: number = 0;
  private moveDirection: number | undefined;
  private moveIntensityNilToOne: number | undefined;
  private controlsPressed: Set<GameControls> = new Set();

  private mouseScreenPos: ScreenPosition = { x: 0, y: 0 };

  private readonly joystickMinDistance = 32;
  private readonly joystickMaxDistance = 128 / 2;

  constructor(gameInstance: GameInstance) {
    super(gameInstance);
  }

  public init(): void {
    document.addEventListener("mousedown", this.onMouseDown.bind(this));
    document.addEventListener("mouseup", this.onMouseUp.bind(this));
    document.addEventListener("mousemove", this.onMouseMove.bind(this));

    document.addEventListener("touchstart", this.onTouchStart.bind(this), { passive: false });
    document.addEventListener("touchmove", this.onTouchStart.bind(this), { passive: false });
    document.addEventListener("touchend", this.onTouchEnd.bind(this), { passive: false });
    document.addEventListener("touchcancel", this.onTouchEnd.bind(this), { passive: false });

    document.addEventListener("keydown", this.onKeyDown.bind(this));
    document.addEventListener("keyup", this.onKeyUp.bind(this));
    document.addEventListener("keypress", this.onKeyPress.bind(this));

    document.body.addEventListener("scroll", this.genericPreventDefault.bind(this));
    document.addEventListener("selectstart", this.genericPreventDefault.bind(this));
    document.addEventListener("select", this.genericPreventDefault.bind(this));
  }

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

  public getMoveIntensity(): number | undefined {
    return this.moveIntensityNilToOne;
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

  private onTouchStart(event: TouchEvent): void {
    event.preventDefault();
    const { joystickLeft, joystickRight, joystickLeftHandle, joystickRightHandle } =
      this.gameInstance.MANAGERS.UIManager;
    let target: HTMLDivElement | undefined = undefined;

    if (event.target === joystickLeft) target = joystickLeft;
    if (event.target === joystickRight) target = joystickRight;
    if (!target) return;

    const boundRect = target.getBoundingClientRect();
    const joystickCenter: ScreenPosition = {
      x: boundRect.left + boundRect.width / 2,
      y: boundRect.top + boundRect.height / 2,
    };

    for (const touch of event.targetTouches) {
      const touchPos: ScreenPosition = { x: touch.clientX, y: touch.clientY };
      const distance = getVectorDistance(touchPos, joystickCenter);

      // Deadzone
      if (distance <= this.joystickMinDistance) {
        this.moveIntensityNilToOne = 0;
        if (event.target === joystickLeft) {
          joystickLeftHandle.classList.remove(styles.joystickHandleActive);
        }
        if (event.target === joystickRight) {
          joystickRightHandle.classList.remove(styles.joystickHandleActive);
        }
        continue;
      }

      const angle = getDirectionalAngle({ x: touch.clientX, y: touch.clientY }, joystickCenter);

      if (event.target === joystickLeft) {
        this.moveDirection = angle;
        const targetDistance = Math.min(this.joystickMaxDistance, distance) - this.joystickMinDistance;
        this.moveIntensityNilToOne = targetDistance / (this.joystickMaxDistance - this.joystickMinDistance);

        this.updateTouchJoystickHandles(angle, this.moveIntensityNilToOne, joystickCenter, joystickLeftHandle);
      }

      if (event.target === joystickRight) {
        this.aimDirection = angle;
        this.simulateControlPress(GameControls.SHOOT);

        const targetDistance = Math.min(this.joystickMaxDistance, distance) - this.joystickMinDistance;
        const moveIntensityNilToOne = targetDistance / (this.joystickMaxDistance - this.joystickMinDistance);
        this.updateTouchJoystickHandles(angle, moveIntensityNilToOne, joystickCenter, joystickLeftHandle);
      }
    }

    target.classList.add(styles.joystickActive);
  }

  private onTouchEnd(event: TouchEvent): void {
    event.preventDefault();
    const { joystickLeft, joystickRight, joystickLeftHandle, joystickRightHandle } =
      this.gameInstance.MANAGERS.UIManager;
    let target: HTMLDivElement | undefined = undefined;

    if (event.target === joystickLeft) {
      target = joystickLeft;
      this.moveDirection = undefined;
      this.moveIntensityNilToOne = undefined;
      joystickLeftHandle.classList.remove(styles.joystickHandleActive);
    }

    if (event.target === joystickRight) {
      target = joystickRight;
      this.simulateControlRelease(GameControls.SHOOT);
      joystickRightHandle.classList.remove(styles.joystickHandleActive);
    }

    if (target) target.classList.remove(styles.joystickActive);
  }

  private updateMousePosition(event: MouseEvent): void {
    const zoom = this.gameInstance.MANAGERS.CameraManager.zoom;
    const rect = this.gameInstance.canvas.getBoundingClientRect();
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;
    this.mouseScreenPos.x = screenX * zoom;
    this.mouseScreenPos.y = screenY * zoom;

    const player = this.gameInstance.MANAGERS.LevelManager.player;
    if (!player) return;
    const mouseWorldPos = this.gameInstance.MANAGERS.CameraManager.screenToWorld(this.mouseScreenPos);
    this.aimDirection = getDirectionalAngle(mouseWorldPos, player.worldPos);
  }

  private updateTouchJoystickHandles(
    angle: number,
    intensityNilToOne: number,
    joystickCenter: ScreenPosition,
    handleTarget: HTMLDivElement,
  ): void {
    const radius = handleTarget.getBoundingClientRect().width / 2;
    handleTarget.classList.add(styles.joystickHandleActive);

    const angleVector: ScreenPosition = radiansToVector(angle);
    handleTarget.style.left = `${joystickCenter.x + angleVector.x * intensityNilToOne * this.joystickMaxDistance - radius}px`;
    handleTarget.style.top = `${joystickCenter.y + angleVector.y * intensityNilToOne * this.joystickMaxDistance - radius}px`;
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
    document.removeEventListener("mousedown", this.onMouseDown.bind(this));
    document.removeEventListener("mouseup", this.onMouseUp.bind(this));
    document.removeEventListener("mousemove", this.onMouseMove.bind(this));

    document.removeEventListener("touchstart", this.onTouchStart.bind(this));
    document.removeEventListener("touchmove", this.onTouchStart.bind(this));
    document.removeEventListener("touchend", this.onTouchEnd.bind(this));
    document.removeEventListener("touchcancel", this.onTouchEnd.bind(this));

    document.removeEventListener("keydown", this.onKeyDown.bind(this));
    document.removeEventListener("keyup", this.onKeyUp.bind(this));
    document.removeEventListener("keypress", this.onKeyPress.bind(this));

    document.body.removeEventListener("scroll", this.genericPreventDefault.bind(this));
    document.removeEventListener("selectstart", this.genericPreventDefault.bind(this));
    document.removeEventListener("select", this.genericPreventDefault.bind(this));

    this.moveDirection = undefined;
    this.controlsPressed.clear();
  }
}
