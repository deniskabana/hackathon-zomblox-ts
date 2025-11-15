import type GameInstance from "../../GameInstance";
import { GameControls } from "../../types/GameControls";
import type { ScreenPosition } from "../../types/ScreenPosition";
import getDirectionalAngle from "../../utils/math/getDirectionalAngle";
import { AManager } from "../abstract/AManager";
import styles from "../../styles/uiControls.module.css";
import getVectorDistance from "../../utils/math/getVectorDistance";
import radiansToVector from "../../utils/math/radiansToVector";
import { Direction, getCardinalDirection } from "../../utils/getCardinalDirection";

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
    document.addEventListener("mousedown", this.onMouseDown);
    document.addEventListener("mouseup", this.onMouseUp);
    document.addEventListener("mousemove", this.onMouseMove);

    document.addEventListener("touchstart", this.onTouchStart, { passive: false });
    document.addEventListener("touchmove", this.onTouchStart, { passive: false });
    document.addEventListener("touchend", this.onTouchEnd, { passive: false });
    document.addEventListener("touchcancel", this.onTouchEnd, { passive: false });

    document.addEventListener("keydown", this.onKeyDown);
    document.addEventListener("keyup", this.onKeyUp);
    document.addEventListener("keypress", this.onKeyPress);

    document.body.addEventListener("scroll", this.genericPreventDefault);
    document.addEventListener("selectstart", this.genericPreventDefault);
    document.addEventListener("select", this.genericPreventDefault);
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

  private genericPreventDefault = (event: Event): void => {
    event.preventDefault();
  };

  private onMouseDown = (): void => {};

  private onMouseUp = (): void => {};

  private onMouseMove = (): void => {};

  private onKeyDown = (event: KeyboardEvent): void => {
    event.preventDefault();
    const control = this.getGameControlByKeyCode(event.code);

    // Force release other controls if any directional control is applied
    if (
      control === GameControls.MOVE_RIGHT ||
      control === GameControls.MOVE_DOWN ||
      control === GameControls.MOVE_LEFT ||
      control === GameControls.MOVE_UP
    ) {
      this.controlsPressed.delete(GameControls.MOVE_RIGHT);
      this.controlsPressed.delete(GameControls.MOVE_DOWN);
      this.controlsPressed.delete(GameControls.MOVE_UP);
      this.controlsPressed.delete(GameControls.MOVE_LEFT);
    }

    if (control) this.controlsPressed.add(control);

    switch (control) {
      case GameControls.MOVE_RIGHT:
        this.aimDirection = 0;
        break;
      case GameControls.MOVE_DOWN:
        this.aimDirection = Math.PI / 2; // 90°
        break;
      case GameControls.MOVE_LEFT:
        this.aimDirection = Math.PI; // 180°
        break;
      case GameControls.MOVE_UP:
        this.aimDirection = (3 * Math.PI) / 2; // 270°
        break;
    }
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    event.preventDefault();
    const control = this.getGameControlByKeyCode(event.code);
    if (control) this.controlsPressed.delete(control);
  };

  private onKeyPress = (event: KeyboardEvent): void => {
    event.preventDefault();
  };

  private onTouchStart = (event: TouchEvent): void => {
    event.preventDefault();
    const { joystickLeft, joystickRight, joystickLeftHandle, joystickRightHandle } =
      this.gameInstance.MANAGERS.UIManager;
    let target: HTMLDivElement | undefined = undefined;

    if (event.target === joystickLeft) target = joystickLeft;
    if (event.target === joystickRight) target = joystickRight;
    if (!target) return;

    const boundRect = target.getBoundingClientRect();
    const joystickCenter: ScreenPosition = {
      x: boundRect.x + boundRect.width / 2,
      y: boundRect.y + boundRect.height / 2,
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
      const direction = getCardinalDirection(angle);

      if (event.target === joystickLeft) {
        this.moveDirection = angle;
        switch (direction) {
          case Direction.RIGHT:
            this.moveDirection = 0;
            break;
          case Direction.UP:
            this.moveDirection = Math.PI / 2; // 90°
            break;
          case Direction.LEFT:
            this.moveDirection = Math.PI; // 180°
            break;
          case Direction.DOWN:
            this.moveDirection = (3 * Math.PI) / 2; // 270°
            break;
        }
        this.aimDirection = this.moveDirection;
        // const targetDistance = Math.min(this.joystickMaxDistance, distance) - this.joystickMinDistance;
        // this.moveIntensityNilToOne = targetDistance / (this.joystickMaxDistance - this.joystickMinDistance);
        this.moveIntensityNilToOne = 1;

        this.updateTouchJoystickHandles(angle, this.moveIntensityNilToOne, joystickCenter, joystickLeftHandle);
      }

      if (event.target === joystickRight) {
        this.aimDirection = angle;
        const targetDistance = Math.min(this.joystickMaxDistance, distance) - this.joystickMinDistance;
        const moveIntensityNilToOne = targetDistance / (this.joystickMaxDistance - this.joystickMinDistance);

        this.updateTouchJoystickHandles(angle, moveIntensityNilToOne, joystickCenter, joystickRightHandle);
      }
    }

    target.classList.add(styles.joystickActive);
  };

  private onTouchEnd = (event: TouchEvent): void => {
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
      joystickRightHandle.classList.remove(styles.joystickHandleActive);
    }

    if (target) target.classList.remove(styles.joystickActive);
  };

  // Utils
  // --------------------------------------------------

  public updateMousePosition(event: MouseEvent): void {
    // TODO: Remove potentially
    const rect = this.gameInstance.canvas.getBoundingClientRect();
    const screenX = event.clientX - rect.x;
    const screenY = event.clientY - rect.y;

    this.mouseScreenPos.x = screenX;
    this.mouseScreenPos.y = screenY;

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
    handleTarget.style.top = `${joystickCenter.y + angleVector.y * intensityNilToOne * this.joystickMaxDistance - radius - parseFloat(this.gameInstance.MANAGERS.UIManager.uiContainer.style.top)}px`;
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

      case "Space":
        control = GameControls.SHOOT;
        break;
      case "Tab":
        control = GameControls.CHANGE_WEAPON;
        break;
      case "Escape":
      case "KeyP":
        control = GameControls.PAUSE;
        break;
      case "KeyB":
        control = GameControls.BUILD_MENU;
        break;

      default:
        return;
    }

    return control;
  }

  public destroy(): void {
    document.removeEventListener("mousedown", this.onMouseDown);
    document.removeEventListener("mouseup", this.onMouseUp);
    document.removeEventListener("mousemove", this.onMouseMove);

    document.removeEventListener("touchstart", this.onTouchStart);
    document.removeEventListener("touchmove", this.onTouchStart);
    document.removeEventListener("touchend", this.onTouchEnd);
    document.removeEventListener("touchcancel", this.onTouchEnd);

    document.removeEventListener("keydown", this.onKeyDown);
    document.removeEventListener("keyup", this.onKeyUp);
    document.removeEventListener("keypress", this.onKeyPress);

    document.body.removeEventListener("scroll", this.genericPreventDefault);
    document.removeEventListener("selectstart", this.genericPreventDefault);
    document.removeEventListener("select", this.genericPreventDefault);

    this.moveDirection = undefined;
    this.controlsPressed.clear();
  }
}
