import type { AssetAudioName } from "../../config/assets";
import { GRID_CONFIG, gridToWorld, type GridPosition, type WorldPosition } from "../../config/gameGrid";
import { DEF_WEAPONS, type Weapon } from "../../config/weapons";
import type GameInstance from "../../GameInstance";
import type { AssetImage } from "../../types/Asset";
import { EntityType } from "../../types/EntityType";
import { GameControls } from "../../types/GameControls";
import { ZIndex } from "../../types/ZIndex";
import assertNever from "../../utils/assertNever";
import areVectorsEqual from "../../utils/math/areVectorsEqual";
import getVectorDistance from "../../utils/math/getVectorDistance";
import normalizeVector from "../../utils/math/normalizeVector";
import { lerpAngle } from "../../utils/math/radialLerp";
import radiansToVector from "../../utils/math/radiansToVector";
import APlayer from "../abstract/APlayer";

export enum PlayerState {
  NORMAL = "NORMAL",
  SHOPPING = "SHOPPING",
  BUILDING = "BUILDING",
  DEAD = "DEAD",
}

export default class Player extends APlayer {
  private playerState: PlayerState;
  private facingDirection: number = 0;
  private moveSpeed: number;
  private isMoving: boolean = false;

  public health: number;
  public maxHealth: number;
  public weapon: Weapon;

  // Timers
  private gunCooldownTimer: number = 0;
  private nextWeaponCooldownTimer: number = 0;
  private stepSoundCooldownTimer: number = 0;
  private buildingModeCooldownTimer: number = 0;

  private readonly stepSoundCooldownInterval: number = 0.35;
  private readonly buildingModeCooldownInterval: number = 0.2;

  constructor(gridPos: GridPosition, entityId: number, gameInstance: GameInstance) {
    super(gameInstance, gridToWorld(gridPos), entityId, true);

    const settings = this.gameInstance.MANAGERS.GameManager.getSettings().rules.player;
    this.playerState = PlayerState.NORMAL;
    this.moveSpeed = settings.movementSpeed;
    this.health = settings.startHealth;
    this.maxHealth = settings.startHealth;
    this.weapon = settings.defaultWeapon;
  }

  public update(_deltaTime: number) {
    this.applyMovement(_deltaTime);
    if (this.gunCooldownTimer > 0) this.gunCooldownTimer -= _deltaTime;
    if (this.nextWeaponCooldownTimer > 0) this.nextWeaponCooldownTimer -= _deltaTime;
    if (this.stepSoundCooldownTimer > 0) this.stepSoundCooldownTimer -= _deltaTime;
    if (this.getCheckShootInput()) this.shoot();
    if (this.gameInstance.MANAGERS.InputManager.isControlDown(GameControls.CHANGE_WEAPON)) this.chooseNextWeapon();

    this.handleBuildingModeInput(_deltaTime);
  }

  public draw() {
    const playerSprite = this.getPlayerSprite();
    if (!playerSprite) return;

    this.gameInstance.MANAGERS.DrawManager.queueDraw(
      this.worldPos.x - GRID_CONFIG.TILE_SIZE / 2,
      this.worldPos.y - GRID_CONFIG.TILE_SIZE / 2,
      playerSprite,
      GRID_CONFIG.TILE_SIZE,
      GRID_CONFIG.TILE_SIZE,
      ZIndex.ENTITIES,
      this.facingDirection + Math.PI / 2,
    );
  }

  private getAimAngle(): number {
    return this.gameInstance.MANAGERS.InputManager.getAimDirection();
  }

  private getMovementInput(): WorldPosition {
    const joystickMoveDirection = this.gameInstance.MANAGERS.InputManager.getMoveDirection();
    if (joystickMoveDirection !== undefined) return radiansToVector(joystickMoveDirection);

    let x = 0;
    let y = 0;

    const input = this.gameInstance.MANAGERS.InputManager;
    if (input.isControlDown(GameControls.MOVE_UP)) y -= 1;
    if (input.isControlDown(GameControls.MOVE_LEFT)) x -= 1;
    if (input.isControlDown(GameControls.MOVE_DOWN)) y += 1;
    if (input.isControlDown(GameControls.MOVE_RIGHT)) x += 1;

    return normalizeVector({ x, y });
  }

  private getCheckShootInput(): boolean {
    return this.gameInstance.MANAGERS.InputManager.isControlDown(GameControls.SHOOT);
  }

  private handleBuildingModeInput(_deltaTime: number): void {
    const isPressed = this.gameInstance.MANAGERS.InputManager.isControlDown(GameControls.BUILD_MENU);

    if (this.buildingModeCooldownTimer > 0) this.buildingModeCooldownTimer -= _deltaTime;

    if (this.buildingModeCooldownTimer <= 0 && isPressed) {
      if (this.playerState !== PlayerState.BUILDING) this.startBuildingMode();
      else this.endBuildingMode();
      this.buildingModeCooldownTimer = this.buildingModeCooldownInterval;
    }
  }

  public startBuildingMode(): void {
    if (this.playerState === PlayerState.BUILDING) return;
    this.playerState = PlayerState.BUILDING;
    this.gameInstance.MANAGERS.BuildModeManager.setBuildMode(true);
  }

  public endBuildingMode(): void {
    if (this.playerState !== PlayerState.BUILDING) return;
    this.playerState = PlayerState.NORMAL;
    this.gameInstance.MANAGERS.BuildModeManager.setBuildMode(false);
  }

  public startShopping(): void {
    if (this.playerState === PlayerState.SHOPPING) return;
    this.playerState = PlayerState.SHOPPING;
  }

  public endShopping(): void {
    if (this.playerState !== PlayerState.SHOPPING) return;
    this.playerState = PlayerState.NORMAL;
  }

  public shoot(): void {
    if (this.playerState !== PlayerState.NORMAL) return;
    if (this.gunCooldownTimer > 0) return;

    const weaponSound = this.getWeaponSound();
    if (weaponSound) this.gameInstance.MANAGERS.AssetManager.playAudioAsset(weaponSound, "sound");

    const weaponDef = DEF_WEAPONS[this.weapon];
    this.gunCooldownTimer = weaponDef.cooldown;
    const gunSpread = weaponDef.spread;

    for (let i = 0; i < weaponDef.shots; i++) {
      const spread = (Math.random() - 0.5) * 2 * ((gunSpread * Math.PI) / 180);
      const angle = this.facingDirection + spread;
      const maxDistance = weaponDef.maxDistance * GRID_CONFIG.TILE_SIZE;

      const raycastHit = this.gameInstance.MANAGERS.LevelManager.raycastShot(this.worldPos, angle, maxDistance);
      if (raycastHit) raycastHit.damage(weaponDef.damage);
      this.gameInstance.MANAGERS.VFXManager.drawShootLine(
        this.worldPos,
        angle,
        raycastHit ? getVectorDistance(this.worldPos, raycastHit.worldPos) : maxDistance,
      );
    }

    this.gameInstance.MANAGERS.CameraManager.effectZoom(
      3 + weaponDef.damage / 2 + weaponDef.shots * 4 - weaponDef.cooldown * 2,
    );
    this.gameInstance.MANAGERS.CameraManager.effectShake(
      3 + weaponDef.damage / 2 + weaponDef.shots * 4 - weaponDef.cooldown * 2,
    );
  }

  private getPlayerSprite(): AssetImage {
    let sprite: AssetImage | undefined;

    switch (this.weapon) {
      case "Revolver":
        sprite = this.gameInstance.MANAGERS.AssetManager.getImageAsset("IPlayerGunRevolver");
        break;
      case "Shotgun":
        sprite = this.gameInstance.MANAGERS.AssetManager.getImageAsset("IPlayerGunShotgun");
        break;
      case "Submachine":
        sprite = this.gameInstance.MANAGERS.AssetManager.getImageAsset("IPlayerGunSmg");
        break;
    }

    return sprite ?? this.gameInstance.MANAGERS.AssetManager.getImageAsset("IPlayerUnarmed")!;
  }

  private getWeaponSound(): AssetAudioName | undefined {
    switch (this.weapon) {
      case "Revolver":
        return "AGunRevolver";
      case "Shotgun":
        return "AGunShotgun";
      case "Submachine":
        return "AGunSMG";
      default:
        assertNever(this.weapon);
    }
  }

  private chooseNextWeapon(): void {
    if (this.nextWeaponCooldownTimer > 0) return;
    const currentWeapon = this.weapon;
    const weapons = Object.keys(DEF_WEAPONS) as Weapon[];
    const currentIndex = weapons.findIndex((name) => name === currentWeapon);
    const newIndex = (currentIndex + 1) % weapons.length;
    this.weapon = weapons[newIndex];
    this.nextWeaponCooldownTimer = 0.25;
  }

  public damage(amount: number): void {
    this.health -= amount;
    this.gunCooldownTimer += 0.4;

    this.gameInstance.MANAGERS.CameraManager.effectZoom(amount * 2);
    this.gameInstance.MANAGERS.CameraManager.effectShake(amount * 2.5);

    if (this.health <= 0) {
      this.die();
    } else {
      this.gameInstance.MANAGERS.AssetManager.playAudioAsset("APlayerHurt", "sound");
    }
  }

  private applyMovement(_deltaTime: number): void {
    const movementVector = this.getMovementInput();

    let speed: typeof this.moveSpeed = this.moveSpeed;
    const joystickMoveIntensity = this.gameInstance.MANAGERS.InputManager.getMoveIntensity();
    if (joystickMoveIntensity !== undefined) speed *= joystickMoveIntensity;

    this.facingDirection = lerpAngle(this.facingDirection, this.getAimAngle(), _deltaTime * 16);

    if (movementVector.x === 0 && movementVector.y === 0) {
      this.isMoving = false;
      return;
    }

    const futurePos = {
      x: this.worldPos.x + movementVector.x * _deltaTime * speed,
      y: this.worldPos.y + movementVector.y * _deltaTime * speed,
    };

    const adjustedFuturePos = this.adjustMovementForCollisions(
      futurePos,
      this.gameInstance.MANAGERS.LevelManager.levelGrid,
      GRID_CONFIG,
    );
    if (areVectorsEqual(adjustedFuturePos, this.worldPos)) {
      this.isMoving = false;
    } else {
      this.setWorldPosition(adjustedFuturePos);
      this.isMoving = true;
    }

    // Play step sound
    if (this.isMoving && this.stepSoundCooldownTimer <= 0) {
      this.gameInstance.MANAGERS.AssetManager.playAudioAsset("APlayerStep", "sound");
      this.stepSoundCooldownTimer = this.stepSoundCooldownInterval;
    }
  }

  public pushbackForce(direction: number, strength: number = 1): void {
    const movementVector = radiansToVector(direction);
    const futurePos = {
      x: this.worldPos.x + movementVector.x * strength,
      y: this.worldPos.y + movementVector.y * strength,
    };

    this.setWorldPosition(
      this.adjustMovementForCollisions(
        futurePos,
        this.gameInstance.MANAGERS.LevelManager.levelGrid,
        GRID_CONFIG,
        true,
        GRID_CONFIG.TILE_SIZE / 4,
      ),
    );
  }

  public getPlayerState(): PlayerState {
    return this.playerState;
  }

  public getFacingDirection(): number {
    return this.facingDirection;
  }

  private die(): void {
    this.playerState = PlayerState.DEAD;
    this.gameInstance.MANAGERS.VFXManager.drawBloodOnScreen();
    this.gameInstance.MANAGERS.AssetManager.playAudioAsset("APlayerDie", "sound");
    this.gameInstance.MANAGERS.LevelManager.destroyEntity(-1, EntityType.PLAYER);

    // TODO: Game over screen
    // setTimeout(this.gameInstance.restartGame.bind(this.gameInstance), 5000);
  }

  public destroy(): void {}
}
