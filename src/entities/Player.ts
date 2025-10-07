import type { WorldPosition } from "../config/gameGrid";
import { gameInstance } from "../main";
import { ZIndex } from "../managers/DrawManager";
import AEntity from "./AEntity";

export enum PlayerSpeed {
  WALK = 3,
  RUN = 6,
}

export default class Player extends AEntity {
  private moveDirection: number = 0;
  private moveSpeed: number = PlayerSpeed.WALK;

  constructor(worldPos: WorldPosition) {
    super(worldPos, true);
  }

  public update(_deltaTime: number) {
    this.moveDirection = this.getAimAngle();
    const movementVector = this.getMovementInput();
    this.worldPos.x += movementVector.x;
    this.worldPos.y += movementVector.y;
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
    const mousePos = gameInstance.MANAGERS.InputManager.mouseWorldPos;
    const dx = mousePos.x - this.worldPos.x;
    const dy = mousePos.y - this.worldPos.y;
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

    return { x: x * this.moveSpeed, y: y * this.moveSpeed };
  }
}
