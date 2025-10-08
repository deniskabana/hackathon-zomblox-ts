import type { AssetAudioName } from "../config/assets";
import type { WorldPosition } from "../config/gameGrid";
import { DEF_WEAPONS, type Weapon } from "../config/weapons";
import { gameInstance } from "../main";
import type { AssetImage } from "../managers/AssetManager";
import { ZIndex } from "../managers/DrawManager";
import getDirectionalAngle from "../utils/getDirectionalAngle";
import normalizeVector from "../utils/normalizeVector";
import AEntity from "./AEntity";

export enum PlayerSpeed {
  WALK = 200,
  RUN = 12,
}

export default class Player extends AEntity {
  private moveDirection: number = 0;
  private moveSpeed: number = PlayerSpeed.WALK;
  private isMoving: boolean = false;

  private gunCooldown: number = 0;
  private nextWeaponCooldown: number = 0;
  private stepSoundCooldown: number = 0;

  public health: number = 100;
  public weapon: Weapon = "Revolver";

  constructor(worldPos: WorldPosition) {
    super(worldPos, true);
  }

  public update(_deltaTime: number) {
    this.moveDirection = this.getAimAngle();
    const movementVector = this.getMovementInput();
    this.isMoving = !(movementVector.x === 0 && movementVector.y === 0);

    this.worldPos.x += movementVector.x * _deltaTime * this.moveSpeed;
    this.worldPos.y += movementVector.y * _deltaTime * this.moveSpeed;

    if (this.gunCooldown > 0) this.gunCooldown -= _deltaTime;
    if (this.nextWeaponCooldown > 0) this.nextWeaponCooldown -= _deltaTime;
    if (this.stepSoundCooldown > 0) this.stepSoundCooldown -= _deltaTime;

    if (this.isMoving && this.stepSoundCooldown <= 0) {
      gameInstance.MANAGERS.AssetManager.playAudioAsset(
        "APlayerStep",
        "sound",
        0.5,
      );
      this.stepSoundCooldown = 0.35;
    }

    if (this.getCheckShootInput()) this.shoot();
    if (gameInstance.MANAGERS.InputManager.isKeyDown("Tab"))
      this.chooseNextWeapon();
  }

  public draw(_deltaTime: number) {
    const playerSprite = this.getPlayerSprite();
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
    return getDirectionalAngle(mouseWorldPos, this.worldPos);
  }

  private getMovementInput(): WorldPosition {
    let x = 0;
    let y = 0;

    const input = gameInstance.MANAGERS.InputManager;
    if (input.isKeyDown("KeyW")) y -= 1;
    if (input.isKeyDown("KeyS")) y += 1;
    if (input.isKeyDown("KeyA")) x -= 1;
    if (input.isKeyDown("KeyD")) x += 1;

    return normalizeVector({ x, y });
  }

  private getCheckShootInput(): boolean {
    return gameInstance.MANAGERS.InputManager.isMouseDown();
  }

  public shoot(): void {
    if (this.gunCooldown > 0) return;
    const weaponSound = this.getWeaponSound();
    if (weaponSound)
      gameInstance.MANAGERS.AssetManager.playAudioAsset(weaponSound, "sound");
    this.gunCooldown = DEF_WEAPONS[this.weapon].cooldown;
  }

  private getPlayerSprite(): AssetImage {
    let sprite: AssetImage | undefined;

    switch (this.weapon) {
      case "Revolver":
        sprite =
          gameInstance.MANAGERS.AssetManager.getImageAsset(
            "IPlayerGunRevolver",
          );
        break;
      case "Shotgun":
        sprite =
          gameInstance.MANAGERS.AssetManager.getImageAsset("IPlayerGunShotgun");
        break;
      case "Submachine":
        sprite =
          gameInstance.MANAGERS.AssetManager.getImageAsset("IPlayerGunSmg");
        break;
    }

    return (
      sprite ??
      gameInstance.MANAGERS.AssetManager.getImageAsset("IPlayerUnarmed")!
    );
  }

  private getWeaponSound(): AssetAudioName | undefined {
    switch (this.weapon) {
      case "Revolver":
        return "AGunRevolver";
      case "Shotgun":
        return "AGunShotgun";
      case "Submachine":
        return "AGunSMG";
    }
  }

  private chooseNextWeapon(): void {
    if (this.nextWeaponCooldown > 0) return;
    const currentWeapon = this.weapon;
    const weapons = Object.keys(DEF_WEAPONS) as Weapon[];
    const currentIndex = weapons.findIndex((name) => name === currentWeapon);
    const newIndex = (currentIndex + 1) % weapons.length;
    this.weapon = weapons[newIndex];
    this.nextWeaponCooldown = 0.25;
  }
}
