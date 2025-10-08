import type { WorldPosition } from "../config/gameGrid";
import { gameInstance } from "../main";
import { ZIndex } from "../managers/DrawManager";
import AEntity from "./AEntity";

export enum PlayerSpeed {
  WALK = 200,
  RUN = 12,
}

export default class Player extends AEntity {
  private moveDirection: number = 0;
  private moveSpeed: number = PlayerSpeed.WALK;
  public health: number = 100;

  constructor(worldPos: WorldPosition) {
    super(worldPos, true);
  }

  public update(_deltaTime: number) {
    this.moveDirection = this.getAimAngle();
    const movementVector = this.getMovementInput();
    this.worldPos.x += movementVector.x * _deltaTime * this.moveSpeed;
    this.worldPos.y += movementVector.y * _deltaTime * this.moveSpeed;
  }

  public draw(_deltaTime: number) {
    const playerSprite =
      gameInstance.MANAGERS.AssetManager.getImageAsset("IPlayerGunShotgun");
    if (!playerSprite) return;

    gameInstance.MANAGERS.DrawManager.queueDraw(
      this.worldPos.x,
      this.worldPos.y,
      playerSprite,
      64,
      64,
      ZIndex.ENTITIES,
      this.moveDirection + Math.PI / 2,
    );
  }

  private getAimAngle(): number {
    const mousePos = gameInstance.MANAGERS.InputManager.mouseScreenPos;
    const mouseWorldPos =
      gameInstance.MANAGERS.CameraManager.screenToWorld(mousePos);
    const dx = mouseWorldPos.x - this.worldPos.x;
    const dy = mouseWorldPos.y - this.worldPos.y;
    return Math.atan2(dy, dx);
  }

  private getMovementInput(): WorldPosition {
    let x = 0;
    let y = 0;

    const input = gameInstance.MANAGERS.InputManager;
    if (input.isKeyDown("KeyW")) y -= 1;
    if (input.isKeyDown("KeyS")) y += 1;
    if (input.isKeyDown("KeyA")) x -= 1;
    if (input.isKeyDown("KeyD")) x += 1;

    // Normalize diagonal movement so you don't move faster diagonally
    if (x !== 0 && y !== 0) {
      const length = Math.sqrt(x * x + y * y);
      x /= length;
      y /= length;
    }

    return { x, y };
  }
}
