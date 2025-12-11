import type { AssetAudioName } from "../../config/assets";
import { GRID_CONFIG, gridToWorld, type GridPosition, type WorldPosition } from "../../config/gameGrid";
import { DEF_WEAPONS, type Weapon } from "../../config/weapons";
import type GameInstance from "../../GameInstance";
import { EntityType } from "../../types/EntityType";
import { GameControls } from "../../types/GameControls";
import { ZIndex } from "../../types/ZIndex";
import assertNever from "../../utils/assertNever";
import { AnimatedSpriteSheet } from "../../utils/classes/AnimatedSpriteSheet";
import areVectorsEqual from "../../utils/math/areVectorsEqual";
import getVectorDistance from "../../utils/math/getVectorDistance";
import normalizeVector from "../../utils/math/normalizeVector";
import { lerpAngle } from "../../utils/math/radialLerp";
import radiansToVector from "../../utils/math/radiansToVector";
import APlayer from "../abstract/APlayer";

export enum PlayerState {
  IDLE = "IDLE",
  WALK = "WALK",
  KNOCKED = "KNOCKED",
  HIT = "HIT",
  DEAD = "DEAD",
}

export default class Player extends APlayer {
  private playerState: PlayerState;
  private facingDirection: number = 0;
  private moveSpeed: number;

  private fps: number;
  private activeAnimation: AnimatedSpriteSheet | undefined;
  private animations: undefined | Record<PlayerState, AnimatedSpriteSheet>;
  private isFacingLeft: boolean = false;

  public health: number;
  public maxHealth: number;
  public weapon: Weapon;

  // Timers
  private gunCooldownTimer: number = 0;
  private stunTimer: number = 0;
  private nextWeaponCooldownTimer: number = 0;
  private stepSoundCooldownTimer: number = 0;
  private buildingModeCooldownTimer: number = 0;

  private readonly stepSoundCooldownInterval: number = 0.35;
  // private readonly buildingModeCooldownInterval: number = 0.2;
  private stunDuration: number;

  constructor(gridPos: GridPosition, entityId: number, gameInstance: GameInstance) {
    super(gameInstance, gridToWorld(gridPos), entityId, true);

    const { GameManager, AssetManager } = this.gameInstance.MANAGERS;

    const settings = GameManager.getSettings().rules.player;
    this.playerState = PlayerState.IDLE;
    this.moveSpeed = settings.movementSpeed;
    this.health = settings.startHealth;
    this.maxHealth = settings.startHealth;
    this.weapon = settings.defaultWeapon;
    this.stunDuration = settings.stunCooldownSec;

    this.fps = 9;

    const spritesheets = {
      [PlayerState.IDLE]: AssetManager.getImageAsset("SPlayerIdle"),
      [PlayerState.WALK]: AssetManager.getImageAsset("SPlayerRun"),
      [PlayerState.KNOCKED]: AssetManager.getImageAsset("SPlayerKnocked"),
      [PlayerState.HIT]: AssetManager.getImageAsset("SPlayerHit"),
      [PlayerState.DEAD]: AssetManager.getImageAsset("SPlayerDeath"),
    } satisfies Record<PlayerState, HTMLImageElement | undefined>;

    let sheetKey: keyof typeof spritesheets;

    if (!this.animations) this.animations = {} as never;
    for (sheetKey in spritesheets) {
      let spriteMeta = { width: 0, height: 0, frames: 0 };

      switch (sheetKey) {
        case PlayerState.IDLE:
          spriteMeta = { width: 32, height: 32, frames: 6 };
          break;
        case PlayerState.WALK:
          spriteMeta = { width: 32, height: 32, frames: 8 };
          break;
        case PlayerState.KNOCKED:
          spriteMeta = { width: 32, height: 32, frames: 6 };
          break;
        case PlayerState.HIT:
          spriteMeta = { width: 32, height: 32, frames: 3 };
          break;
        case PlayerState.DEAD:
          spriteMeta = { width: 32, height: 32, frames: 8 };
          break;

        default:
          assertNever(sheetKey);
      }

      const spritesheet = spritesheets[sheetKey];
      if (!spritesheet) continue;

      this.animations[sheetKey] = AnimatedSpriteSheet.fromGrid(
        spritesheet,
        spriteMeta.width,
        spriteMeta.height,
        spriteMeta.frames,
        this.fps,
        sheetKey === PlayerState.IDLE || sheetKey === PlayerState.WALK || sheetKey === PlayerState.KNOCKED,
      );
    }

    this.activeAnimation = this.animations?.IDLE;
  }

  public update(_deltaTime: number) {
    this.activeAnimation?.update(Math.min(_deltaTime, 1 / this.fps));

    if (this.stunTimer <= 0) {
      if (this.playerState === PlayerState.KNOCKED) this.playerState = PlayerState.IDLE;
      this.applyMovement(_deltaTime);

      if (this.gunCooldownTimer > 0) this.gunCooldownTimer -= _deltaTime;
      if (this.nextWeaponCooldownTimer > 0) this.nextWeaponCooldownTimer -= _deltaTime;

      if (this.stepSoundCooldownTimer > 0) this.stepSoundCooldownTimer -= _deltaTime;

      if (this.getCheckShootInput()) this.shoot();

      if (this.gameInstance.MANAGERS.InputManager.isControlDown(GameControls.CHANGE_WEAPON)) this.chooseNextWeapon();
    } else this.stunTimer -= _deltaTime;

    this.handleBuildingModeInput(_deltaTime);

    switch (this.playerState) {
      case PlayerState.IDLE:
        this.activeAnimation = this.animations?.IDLE;
        break;
      case PlayerState.WALK:
        this.activeAnimation = this.animations?.WALK;
        break;
      case PlayerState.KNOCKED:
        this.activeAnimation = this.animations?.KNOCKED;
        break;
      case PlayerState.HIT:
      case PlayerState.DEAD:
        break;
    }
  }

  public draw() {
    if (!this.activeAnimation) return;
    const { DrawManager, AssetManager } = this.gameInstance.MANAGERS;

    const size = GRID_CONFIG.TILE_SIZE * 1.35;
    const indicatorSize = size * 2;

    this.drawShadow(size * 0.75);

    DrawManager.queueDrawSprite(
      this.worldPos.x - size / 2,
      this.worldPos.y - size * 0.95,
      this.activeAnimation,
      this.activeAnimation.getCurrentFrame(),
      size,
      size,
      ZIndex.ENTITIES,
      0,
      1,
      this.isFacingLeft ? 1 : -1,
    );
    DrawManager.queueDraw(
      this.worldPos.x - indicatorSize * 0.5,
      this.worldPos.y - indicatorSize * 0.65,
      AssetManager.getImageAsset("IPlayerAimIndicator")!,
      indicatorSize,
      indicatorSize,
      ZIndex.INDICATORS,
      this.facingDirection,
    );
  }

  public drawShadow(size: number): void {
    const { DrawManager, AssetManager } = this.gameInstance.MANAGERS;

    const shadowSprite = AssetManager.getImageAsset("IFXEntityShadow");
    if (shadowSprite)
      DrawManager.queueDraw(
        this.worldPos.x - size / 2,
        this.worldPos.y - size * 0.65,
        shadowSprite,
        size,
        size,
        ZIndex.ENTITIES,
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
      //  this.startBuildingMode();
      // else this.endBuildingMode();
      // this.buildingModeCooldownTimer = this.buildingModeCooldownInterval;
    }
  }

  public startBuildingMode(): void {
    this.gameInstance.MANAGERS.BuildModeManager.setBuildMode(true);
  }

  public endBuildingMode(): void {
    this.gameInstance.MANAGERS.BuildModeManager.setBuildMode(false);
  }

  public startShopping(): void {}

  public endShopping(): void {}

  public shoot(): void {
    if (this.playerState === PlayerState.KNOCKED || this.playerState === PlayerState.DEAD) return;
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
    this.stunTimer = this.stunDuration;
    this.playerState = PlayerState.KNOCKED;

    this.gameInstance.MANAGERS.CameraManager.effectZoom(amount * 2);
    this.gameInstance.MANAGERS.CameraManager.effectShake(amount * 5);

    if (this.health <= 0) {
      this.die();
    } else {
      this.gameInstance.MANAGERS.AssetManager.playAudioAsset("APlayerHurt", "sound");
    }
  }

  private applyMovement(_deltaTime: number): boolean {
    let isMoving = false;
    const movementVector = this.getMovementInput();

    let speed: typeof this.moveSpeed = this.moveSpeed;
    const joystickMoveIntensity = this.gameInstance.MANAGERS.InputManager.getMoveIntensity();
    if (joystickMoveIntensity !== undefined) speed *= joystickMoveIntensity;

    this.facingDirection = lerpAngle(this.facingDirection, this.getAimAngle(), _deltaTime * 16);

    if (movementVector.x === 0 && movementVector.y === 0) {
      isMoving = false;
      if (this.playerState === PlayerState.WALK) this.playerState = PlayerState.IDLE;
      return isMoving;
    }

    const futurePos = {
      x: this.worldPos.x + movementVector.x * _deltaTime * speed,
      y: this.worldPos.y + movementVector.y * _deltaTime * speed,
    };

    if (futurePos.x < this.worldPos.x) this.isFacingLeft = true;
    else if (futurePos.x > this.worldPos.x) this.isFacingLeft = false;

    const adjustedFuturePos = this.adjustMovementForCollisions(
      futurePos,
      this.gameInstance.MANAGERS.LevelManager.levelGrid,
      GRID_CONFIG,
    );

    if (areVectorsEqual(adjustedFuturePos, this.worldPos)) {
      isMoving = false;
    } else {
      this.setWorldPosition(adjustedFuturePos);
      isMoving = true;
    }

    if (isMoving) this.playerState = PlayerState.WALK;

    // Play step sound
    if (isMoving && this.stepSoundCooldownTimer <= 0) {
      this.gameInstance.MANAGERS.AssetManager.playAudioAsset("APlayerStep", "sound");
      this.stepSoundCooldownTimer = this.stepSoundCooldownInterval;
    }

    return isMoving;
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
    const { VFXManager, AssetManager, LevelManager, UIManager } = this.gameInstance.MANAGERS;
    this.playerState = PlayerState.DEAD;
    VFXManager.drawBloodOnScreen(600);
    AssetManager.playAudioAsset("APlayerDie", "sound");
    LevelManager.destroyEntity(-1, EntityType.PLAYER);
    const levelState = LevelManager.levelState;
    if (!levelState) return;
    UIManager.showGameOverScreen(levelState);
  }

  public destroy(): void {}
}
