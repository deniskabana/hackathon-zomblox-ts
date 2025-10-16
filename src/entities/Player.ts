import type { AssetAudioName } from "../config/assets";
import {
  GRID_CONFIG,
  gridToWorld,
  WORLD_SIZE,
  worldToGrid,
  type GridPosition,
  type WorldPosition,
} from "../config/gameGrid";
import { DEF_WEAPONS, type Weapon } from "../config/weapons";
import type GameInstance from "../GameInstance";
import type { AssetImage } from "../managers/AssetManager";
import { ZIndex } from "../managers/DrawManager";
import { GridTileState } from "../types/Grid";
import getDirectionalAngle from "../utils/getDirectionalAngle";
import getVectorDistance from "../utils/getVectorDistance";
import normalizeVector from "../utils/normalizeVector";
import AEntity from "./AEntity";

export default class Player extends AEntity {
  private gameInstance: GameInstance;
  private moveDirection: number = 0;
  private moveSpeed: number;
  private isMoving: boolean = false;

  public health: number;
  public maxHealth: number;
  public weapon: Weapon;

  // Timers
  private gunCooldownTimer: number = 0;
  private nextWeaponCooldownTimer: number = 0;
  private stepSoundCooldownTimer: number = 0;

  constructor(gridPos: GridPosition, entityId: number, gameInstance: GameInstance) {
    super(gridToWorld(gridPos), entityId, true);
    this.gameInstance = gameInstance;

    const settings = this.gameInstance.MANAGERS.GameManager.getSettings().rules.player;
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
    if (this.gameInstance.MANAGERS.InputManager.isKeyDown("Tab")) this.chooseNextWeapon();
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
      this.moveDirection + Math.PI / 2,
    );
  }

  private getAimAngle(): number {
    const mousePos = this.gameInstance.MANAGERS.InputManager.mouseScreenPos;
    const mouseWorldPos = this.gameInstance.MANAGERS.CameraManager.screenToWorld(mousePos);
    return getDirectionalAngle(mouseWorldPos, this.worldPos);
  }

  private getMovementInput(): WorldPosition {
    let x = 0;
    let y = 0;

    const input = this.gameInstance.MANAGERS.InputManager;
    if (input.isKeyDown("KeyW")) y -= 1;
    if (input.isKeyDown("KeyS")) y += 1;
    if (input.isKeyDown("KeyA")) x -= 1;
    if (input.isKeyDown("KeyD")) x += 1;

    return normalizeVector({ x, y });
  }

  private getCheckShootInput(): boolean {
    return this.gameInstance.MANAGERS.InputManager.isMouseDown();
  }

  public shoot(): void {
    if (this.gunCooldownTimer > 0) return;
    const weaponSound = this.getWeaponSound();
    if (weaponSound) this.gameInstance.MANAGERS.AssetManager.playAudioAsset(weaponSound, "sound");

    const weaponDef = DEF_WEAPONS[this.weapon];
    this.gunCooldownTimer = weaponDef.cooldown;
    const gunSpread = weaponDef.spread;

    for (let i = 0; i < weaponDef.shots; i++) {
      const spread = (Math.random() - 0.5) * 2 * ((gunSpread * Math.PI) / 180);
      const angle = this.moveDirection + spread;
      const maxDistance = weaponDef.maxDistance * GRID_CONFIG.TILE_SIZE;

      const raycastHit = this.gameInstance.MANAGERS.LevelManager.raycastShot(this.worldPos, angle, maxDistance);
      if (raycastHit) raycastHit.damage(weaponDef.damage);
      this.gameInstance.MANAGERS.VFXManager.drawShootLine(
        this.worldPos,
        angle,
        raycastHit ? getVectorDistance(this.worldPos, raycastHit.worldPos) : maxDistance,
      );
    }
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
    if (this.health <= 0) {
      this.gameInstance.MANAGERS.AssetManager.playAudioAsset("APlayerDie", "sound");
      // TODO: DIE
    } else {
      this.gameInstance.MANAGERS.AssetManager.playAudioAsset("APlayerHurt", "sound");
    }
    console.warn("PLAYER HEALTH: ", this.health);
  }

  private checkHasCollisions(futurePos: WorldPosition): boolean {
    const radius = GRID_CONFIG.TILE_SIZE / 3;

    if (futurePos.x - radius < 0 || futurePos.x + radius >= WORLD_SIZE.WIDTH) return true;
    if (futurePos.y - radius < 0 || futurePos.y + radius >= WORLD_SIZE.HEIGHT) return true;

    const gridPosList: GridPosition[] = [
      worldToGrid({ x: futurePos.x - radius, y: futurePos.y - radius }),
      worldToGrid({ x: futurePos.x - radius, y: futurePos.y + radius }),
      worldToGrid({ x: futurePos.x + radius, y: futurePos.y + radius }),
      worldToGrid({ x: futurePos.x + radius, y: futurePos.y - radius }),
    ];

    const levelGrid = this.gameInstance.MANAGERS.LevelManager.levelGrid;
    if (!levelGrid) return false;
    for (const gridPos of gridPosList) {
      const { state } = levelGrid[gridPos.x][gridPos.y];
      if (state === GridTileState.BLOCKED) return true;
    }

    return false;
  }

  private applyMovement(_deltaTime: number): void {
    this.moveDirection = this.getAimAngle();
    const movementVector = this.getMovementInput();
    this.isMoving = !(movementVector.x === 0 && movementVector.y === 0);

    const futurePos = {
      x: this.worldPos.x + movementVector.x * _deltaTime * this.moveSpeed,
      y: this.worldPos.y + movementVector.y * _deltaTime * this.moveSpeed,
    };

    // BUG: Movement is restricted if diagonal and ANY axis collides
    if (!this.checkHasCollisions(futurePos)) this.setWorldPosition(futurePos);

    // Play step sound
    if (this.isMoving && this.stepSoundCooldownTimer <= 0) {
      this.gameInstance.MANAGERS.AssetManager.playAudioAsset("APlayerStep", "sound");
      this.stepSoundCooldownTimer = 0.35;
    }
  }
}
