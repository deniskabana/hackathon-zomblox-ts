import {
  type GridPosition,
  GRID_CONFIG,
  gridToWorld,
  type WorldPosition,
  worldToGrid,
  type GridConfig,
} from "../../../config/core/grid.config";
import type { AssetAudioName } from "../../../config/game/assets.config";
import { type Weapon, DEF_WEAPONS } from "../../../config/game/weapons.config";
import type GameInstance from "../../../GameInstance";
import { EntityType } from "../../../types/EntityType";
import { GameControls } from "../../../types/GameControls";
import { GridTileState } from "../../../types/Grid";
import { ZIndex } from "../../../types/ZIndex";
import assertNever from "../../../utils/assertNever";
import SpriteSheet from "../../../utils/classes/SpriteSheet";
import { Direction } from "../../../utils/getCardinalDirection";
import isInsideGrid from "../../../utils/grid/isInsideGrid";
import areVectorsEqual from "../../../utils/math/areVectorsEqual";
import getVectorDistance from "../../../utils/math/getVectorDistance";
import normalizeVector from "../../../utils/math/normalizeVector";
import radiansToVector from "../../../utils/math/radiansToVector";
import AEntity, { type AEntityEngine, type EntityConstructorProps } from "../../engine/AEntity";
import type { EntityAnimationsSpecs } from "../../engine/systems/EntityAnimation";
import { EntityTimer } from "../../engine/systems/EntityTimer";

/** `this.gameInstance` */ let _game: GameInstance;

export enum PlayerState {
  IDLE = "IDLE",
  WALK = "WALK",
  KNOCKED = "KNOCKED",
  HIT = "HIT",
  DEAD = "DEAD",
}

interface Timers {
  attackCooldown: EntityTimer<"Cooldown between allowed attacks">;
  stun: EntityTimer<"Controls if the player is stunned">;
  btnWeaponSwitch: EntityTimer<"Throttles weapon switching speed">;
  stepSound: EntityTimer<"Delay between steps">;
}

interface Settings {
  stepSoundInterval: number;
  buildingModeInterval: number;
  stunDuration: number;
  maxSpeed: number;
}

interface Instance {
  speed: number;
  isFacingLeft: boolean;
  prevGridPos: GridPosition | undefined;
  currentWeapon: Weapon;
  facingDirection: Direction;
  weaponSprites: SpriteSheet | undefined;
}

export default class Player extends AEntity<PlayerState, Instance, Timers, Settings> {
  constructor({ gameInstance, entityId, gridPos }: EntityConstructorProps) {
    _game = gameInstance;
    const { GameManager, AssetManager } = _game.MANAGERS;
    const { startHealth, movementSpeed, defaultWeapon, stunCooldownSec } = GameManager.getSettings().rules.player;
    const size = GRID_CONFIG.TILE_SIZE * 1.5;

    const settings: Settings = {
      stepSoundInterval: 0.35,
      buildingModeInterval: 2,
      stunDuration: stunCooldownSec,
      maxSpeed: movementSpeed,
    };

    const timers: Timers = {
      attackCooldown: new EntityTimer({ initialValue: 0, autoStart: false }),
      stepSound: new EntityTimer({ initialValue: settings.stepSoundInterval, autoStart: false }),
      btnWeaponSwitch: new EntityTimer({ initialValue: 0.25, autoStart: false }),
      stun: new EntityTimer({ initialValue: settings.stunDuration, autoStart: false }),
    };

    const animations: EntityAnimationsSpecs = {
      frameWidth: 32,
      frameHeight: 32,
      fps: 12,
      animations: [
        { id: "idle", frameCount: 6, assetVariants: [AssetManager.getImageAsset("SPlayerIdle")!] },
        {
          id: "run",
          frameCount: 8,
          assetVariants: [AssetManager.getImageAsset("SPlayerRun")!],
        },
        { id: "knocked", frameCount: 6, assetVariants: [AssetManager.getImageAsset("SPlayerKnocked")!] },
        { id: "hit", frameCount: 3, assetVariants: [AssetManager.getImageAsset("SPlayerHit")!] },
        { id: "death", frameCount: 8, assetVariants: [AssetManager.getImageAsset("SPlayerDeath")!] },
      ],
    };

    const instance: Instance = {
      currentWeapon: defaultWeapon,
      prevGridPos: undefined,
      isFacingLeft: false,
      speed: 0,
      facingDirection: Direction.RIGHT,
      weaponSprites: SpriteSheet.fromGrid(AssetManager.getImageAsset("SPlayerWeapons")!, 32, 32, 12),
    };

    super({
      worldPos: gridToWorld(gridPos),
      size,
      entityId,
      animations,
      settings,
      initialState: PlayerState.IDLE,
      timers,
      health: startHealth,
      instance,
    });
  }

  public _engine: AEntityEngine = {
    draw: () => {
      const { DrawManager } = _game.MANAGERS;

      const size = this._getSize();
      this._animations?.drawActiveAnimations(this._getWorldPosition(), size, DrawManager, {
        scaleX: this._instance.isFacingLeft ? 1 : -1,
      });

      const weaponSize = GRID_CONFIG.TILE_SIZE * 1.5;
      this.drawWeapon(weaponSize);
    },

    drawDebug: () => {
      const { GameManager, DrawManager } = _game.MANAGERS;

      if (GameManager.getSettings().debug.enableFlowFieldRender) {
        const gridPos = this._getGridPosition();
        const debugSize = GRID_CONFIG.TILE_SIZE / 2;
        const { x, y } = this._getWorldPosition();
        const { TILE_SIZE } = GRID_CONFIG;

        DrawManager.drawRectOutline(gridPos.x, gridPos.y, TILE_SIZE, TILE_SIZE, "#ca6", 3);
        DrawManager.drawLine(x - debugSize / 2, y - debugSize / 2, x + debugSize / 2, y + debugSize / 2, "#ca6", 3);
        DrawManager.drawLine(x + debugSize / 2, y - debugSize / 2, x - debugSize / 2, y + debugSize / 2, "#ca6", 3);
      }
    },

    drawShadow: () => {
      const { DrawManager, AssetManager } = _game.MANAGERS;
      const { x, y } = this._getWorldPosition();
      const shadowSprite = AssetManager.getImageAsset("IFXEntityShadow");
      const size = this._getSize() * 0.75;

      if (!shadowSprite) return;
      DrawManager.queueDraw(x - size / 2, y - size * 0.65, shadowSprite, size, size, ZIndex.GROUND_EFFECTS);
    },

    onDestroy: () => {
      const { LevelManager, UIManager } = _game.MANAGERS;
      if (LevelManager.levelState) UIManager.showGameOverScreen(LevelManager.levelState); // TODO: Move to LevelManager
    },

    updateBefore: (_deltaTime: number) => {
      const state = this._getState();

      switch (state) {
        case PlayerState.IDLE:
          this._animations?.setActiveAnimations(["idle"]);
          break;
        case PlayerState.WALK:
          this._animations?.setActiveAnimations(["run"]);
          break;
        case PlayerState.KNOCKED:
          this._animations?.setActiveAnimations(["knocked"]);
          break;
        case PlayerState.HIT:
          this._animations?.setActiveAnimations(["hit"]);
          break;
        case PlayerState.DEAD:
          this._animations?.setActiveAnimations(["death"]);
          break;
        default:
          assertNever(state);
      }

      this.getShootingInput();
      this.getWeaponCycleInput();
      this.getBuildingModeInput(_deltaTime);
    },

    updateAfter: (_deltaTime: number) => {
      if (this._getState() === PlayerState.KNOCKED && this._timers.stun.getIsDone()) {
        this._setState(PlayerState.IDLE);
      }

      this.applyMovement(_deltaTime);
    },

    onDamage: (amount) => {
      const { AssetManager, CameraManager } = _game.MANAGERS;

      this._timers.stun.reset();
      this._setState(PlayerState.KNOCKED);

      CameraManager.effectZoom(amount * 2);
      CameraManager.effectShake(amount * 5);

      if (this._getHealth() - amount > 0) {
        AssetManager.playAudioAsset("APlayerHurt", "sound");
      }
    },

    onDeath: () => {
      const { VFXManager, AssetManager, LevelManager } = _game.MANAGERS;

      this._setState(PlayerState.DEAD);
      VFXManager.drawBloodOnScreen(600);
      AssetManager.playAudioAsset("APlayerDie", "sound");
      LevelManager.destroyEntity(-1, EntityType.PLAYER);
    },
  };

  private drawWeapon(weaponSize: number): void {
    const { DrawManager } = _game.MANAGERS;
    const playerCardinalDirection = this._instance.facingDirection;
    const isFacingLeft = this._instance.isFacingLeft;
    const { x, y } = this._getWorldPosition();

    let angle: number = 0;
    let scaleX: 1 | -1 = 1;
    let scaleY: 1 | -1 = 1;
    let offsetX: number = 0;
    let offsetY: number = 0;

    switch (playerCardinalDirection) {
      case Direction.DOWN:
        scaleX = isFacingLeft ? -1 : 1;
        angle = isFacingLeft ? (3 * Math.PI) / 2 : Math.PI / 2;
        scaleY = 1;
        offsetX = isFacingLeft ? weaponSize * 0.6 : weaponSize * 0.4;
        offsetY = weaponSize * 0.55;
        break;

      case Direction.UP:
        scaleX = isFacingLeft ? -1 : 1;
        angle = isFacingLeft ? Math.PI / 2 : (3 * Math.PI) / 2;
        scaleY = 1;
        offsetX = isFacingLeft ? weaponSize * 0.6 : weaponSize * 0.4;
        offsetY = weaponSize * 0.95;
        break;

      case Direction.LEFT:
        scaleX = -1;
        scaleY = 1;
        angle = 0;
        offsetX = weaponSize * 0.75;
        offsetY = weaponSize * 0.75;
        break;

      case Direction.RIGHT:
        scaleX = 1;
        scaleY = 1;
        angle = 0;
        offsetX = weaponSize * 0.2;
        offsetY = weaponSize * 0.75;
        break;

      default:
        assertNever(playerCardinalDirection);
    }

    DrawManager.queueDrawSprite(
      x - offsetX,
      y - offsetY,
      this._instance.weaponSprites!,
      this.getCurrentWeaponSprite() ?? 6,
      weaponSize,
      weaponSize,
      ZIndex.ENTITIES,
      angle,
      1,
      scaleX,
      scaleY,
    );
  }

  private getMovementInputVector(): WorldPosition {
    const { InputManager } = _game.MANAGERS;
    let x = 0;
    let y = 0;

    // TODO: Convert to `getLatestMovementInput`

    if (InputManager.isControlDown(GameControls.MOVE_UP)) {
      y -= 1;
      this._instance.facingDirection = Direction.UP;
    }
    if (InputManager.isControlDown(GameControls.MOVE_LEFT)) {
      x -= 1;
      this._instance.facingDirection = Direction.LEFT;
    }
    if (InputManager.isControlDown(GameControls.MOVE_DOWN)) {
      y += 1;
      this._instance.facingDirection = Direction.DOWN;
    }
    if (InputManager.isControlDown(GameControls.MOVE_RIGHT)) {
      x += 1;
      this._instance.facingDirection = Direction.RIGHT;
    }

    return normalizeVector({ x, y });
  }

  private getBuildingModeInput(_deltaTime: number): void {
    const { InputManager, BuildModeManager } = _game.MANAGERS;
    const isPressed = InputManager.isControlDown(GameControls.BUILD_MENU);

    if (isPressed) {
      BuildModeManager.setBuildMode(!BuildModeManager.isBuildModeActive);
    }
  }

  private getShootingInput(): void {
    const { InputManager, AssetManager, CameraManager, LevelManager, VFXManager } = _game.MANAGERS;
    const state = this._getState();
    const weaponSound = this.getCurrentWeaponSound();
    const { currentWeapon, isFacingLeft } = this._instance;
    const weaponDef = DEF_WEAPONS[currentWeapon];
    const gunSpread = weaponDef.spread;
    const maxDistance = weaponDef.maxDistance * GRID_CONFIG.TILE_SIZE;
    const size = this._getSize();
    const playerCardinalDirection = this._instance.facingDirection;
    const { x, y } = this._getWorldPosition();

    if (!InputManager.isControlDown(GameControls.SHOOT)) return;
    if (state === PlayerState.KNOCKED || state === PlayerState.DEAD) return;
    if (!this._timers.attackCooldown.getIsDone()) return;

    this._timers.attackCooldown.reset(weaponDef.cooldown);
    if (weaponSound) AssetManager.playAudioAsset(weaponSound, "sound");

    for (let i = 0; i < weaponDef.shots; i++) {
      const spread = (Math.random() - 0.5) * 2 * ((gunSpread * Math.PI) / 180);
      let angle: number = 0;
      switch (this._instance.facingDirection) {
        case Direction.UP:
          angle = -Math.PI / 2;
          break;
        case Direction.DOWN:
          angle = Math.PI / 2;
          break;
        case Direction.LEFT:
          angle = Math.PI;
          break;
        case Direction.RIGHT:
          angle = 0;
          break;
      }
      angle += spread;
      const raycastHit = LevelManager.raycastShot(this._getWorldPosition(), angle, maxDistance);

      if (raycastHit) raycastHit._handleDamage(weaponDef.damage);

      let originOffsetX: number = 0;
      let originOffsetY: number = 0;

      // Offset for where shoot line VFX starts
      switch (playerCardinalDirection) {
        case Direction.UP:
          originOffsetY = size * 0.25;
          if (isFacingLeft) originOffsetX = size * 0.1 * -1;
          else originOffsetX = size * 0.15;
          break;
        case Direction.DOWN:
          originOffsetY = size * 0.7 * -1;
          if (isFacingLeft) originOffsetX = size * 0.05 * -1;
          else originOffsetX = size * 0.05;
          break;
        case Direction.LEFT:
          originOffsetX = size * 0.5 * -1;
          originOffsetY = size * 0.25 * -1;
          break;
        case Direction.RIGHT:
          originOffsetX = size * 0.6;
          originOffsetY = size * 0.25 * -1;
          break;
        default:
          assertNever(playerCardinalDirection);
      }

      VFXManager.drawShootLine(
        { x: x + originOffsetX, y: y + originOffsetY },
        angle,
        raycastHit ? getVectorDistance(this._getWorldPosition(), raycastHit._getWorldPosition()) : maxDistance,
      );
    }

    CameraManager.effectZoom(3 + weaponDef.damage / 2 + weaponDef.shots * 4 - weaponDef.cooldown * 2);
    CameraManager.effectShake(3 + weaponDef.damage / 2 + weaponDef.shots * 4 - weaponDef.cooldown * 2);
  }

  private getCurrentWeaponSound(): AssetAudioName | undefined {
    const { currentWeapon } = this._instance;

    switch (currentWeapon) {
      case "Revolver":
        return "AGunRevolver";
      case "Shotgun":
        return "AGunShotgun";
      case "Submachine":
        return "AGunSMG";
      default:
        assertNever(currentWeapon);
    }
  }

  private getCurrentWeaponSprite(): number | undefined {
    const { currentWeapon } = this._instance;

    switch (currentWeapon) {
      case "Revolver":
        return 2;
      case "Shotgun":
        return 3;
      case "Submachine":
        return 7;
      default:
        assertNever(currentWeapon);
    }
  }

  private getWeaponCycleInput(): void {
    const { InputManager } = _game.MANAGERS;
    const { currentWeapon } = this._instance;
    const allWeaponsDef = Object.keys(DEF_WEAPONS) as Weapon[];
    const currentWeaponIndex = allWeaponsDef.findIndex((name) => name === currentWeapon);
    const newIndex = (currentWeaponIndex + 1) % allWeaponsDef.length;

    if (!InputManager.isControlDown(GameControls.CHANGE_WEAPON)) return;
    if (!this._timers.btnWeaponSwitch.getIsDone()) return;

    this._instance.currentWeapon = allWeaponsDef[newIndex];
    this._timers.btnWeaponSwitch.reset();
  }

  private applyMovement(_deltaTime: number): void {
    const { AssetManager, LevelManager } = _game.MANAGERS;
    const { levelGrid } = LevelManager;
    const vector = this.getMovementInputVector();
    const state = this._getState();
    const { x, y } = this._getWorldPosition();
    const speed = this._settings.maxSpeed;

    if (vector.x === 0 && vector.y === 0) {
      if (state === PlayerState.WALK) this._setState(PlayerState.IDLE);
      return;
    }

    const futurePos: WorldPosition = {
      x: x + vector.x * _deltaTime * speed,
      y: y + vector.y * _deltaTime * speed,
    };

    const futureGridPos = worldToGrid(futurePos);
    if (
      !areVectorsEqual(futureGridPos, this._getGridPosition()) &&
      levelGrid?.[futureGridPos.x]?.[futureGridPos.y]?.state === GridTileState.BLOCKED
    ) {
      this._setState(PlayerState.IDLE);
      return;
    }

    const adjustedFuturePos = futurePos;

    if (areVectorsEqual(adjustedFuturePos, this._getWorldPosition())) return;

    if (futurePos.x < x) this._instance.isFacingLeft = true;
    else if (futurePos.x > x) this._instance.isFacingLeft = false;

    this._setWorldPosition(adjustedFuturePos);
    this._setState(PlayerState.WALK);

    if (this._timers.stepSound.getIsDone()) {
      AssetManager.playAudioAsset("APlayerStep", "sound");
      this._timers.stepSound.reset();
    }
  }

  public handlePhysicsPushback(direction: number, strength: number = 1): void {
    const movementVector = radiansToVector(direction);
    const { x, y } = this._getWorldPosition();
    const futurePos = { x: x + movementVector.x * strength, y: y + movementVector.y * strength };

    this._setWorldPosition(this.adjustMovementForCollisions(futurePos, GRID_CONFIG, true, GRID_CONFIG.TILE_SIZE / 4));
  }

  /**
   * A complex function that handles collision and applying counter-movements to negate them.
   */
  private adjustMovementForCollisions(
    futurePos: WorldPosition,
    gridConfig: GridConfig,
    includeWorldBoundaries: boolean = true,
    customRadius?: number,
  ): WorldPosition {
    const flowField = _game.MANAGERS.LevelManager.flowField;
    const radius = customRadius ?? gridConfig.TILE_SIZE / 3;
    const resultPos: WorldPosition = { ...futurePos };
    const worldWidth = gridConfig.TILE_SIZE * gridConfig.GRID_WIDTH;
    const worldHeight = gridConfig.TILE_SIZE * gridConfig.GRID_HEIGHT;

    if (includeWorldBoundaries) {
      if (futurePos.x - radius < 0) resultPos.x = 0 + radius;
      if (futurePos.x + radius >= worldWidth) resultPos.x = worldWidth - radius;
      if (futurePos.y - radius < 0) resultPos.y = 0 + radius;
      if (futurePos.y + radius >= worldHeight) resultPos.y = worldHeight - radius;
    }

    if (!flowField) return resultPos;

    const edgeChecks = [
      { pos: worldToGrid({ x: futurePos.x - radius, y: futurePos.y }), axis: "x" as const, dir: -1 },
      { pos: worldToGrid({ x: futurePos.x + radius, y: futurePos.y }), axis: "x" as const, dir: 1 },
      { pos: worldToGrid({ x: futurePos.x, y: futurePos.y - radius }), axis: "y" as const, dir: -1 },
      { pos: worldToGrid({ x: futurePos.x, y: futurePos.y + radius }), axis: "y" as const, dir: 1 },
    ];

    let hasEdgeCollision = false;

    for (const check of edgeChecks) {
      if (!isInsideGrid(check.pos)) continue;
      if (flowField?.[check.pos.x]?.[check.pos.y]?.weight !== Infinity) continue;

      hasEdgeCollision = true;

      const blockRect = {
        left: check.pos.x * gridConfig.TILE_SIZE,
        top: check.pos.y * gridConfig.TILE_SIZE,
        right: (check.pos.x + 1) * gridConfig.TILE_SIZE,
        bottom: (check.pos.y + 1) * gridConfig.TILE_SIZE,
      };

      if (check.axis === "x") {
        if (check.dir < 0) {
          resultPos.x = Math.max(resultPos.x, blockRect.right + radius);
        } else {
          resultPos.x = Math.min(resultPos.x, blockRect.left - radius);
        }
      } else {
        if (check.dir < 0) {
          resultPos.y = Math.max(resultPos.y, blockRect.bottom + radius);
        } else {
          resultPos.y = Math.min(resultPos.y, blockRect.top - radius);
        }
      }
    }

    if (!hasEdgeCollision) {
      const cornerChecks = [
        { pos: worldToGrid({ x: futurePos.x - radius, y: futurePos.y - radius }), offsetX: -1, offsetY: -1 },
        { pos: worldToGrid({ x: futurePos.x + radius, y: futurePos.y - radius }), offsetX: 1, offsetY: -1 },
        { pos: worldToGrid({ x: futurePos.x - radius, y: futurePos.y + radius }), offsetX: -1, offsetY: 1 },
        { pos: worldToGrid({ x: futurePos.x + radius, y: futurePos.y + radius }), offsetX: 1, offsetY: 1 },
      ];

      for (const check of cornerChecks) {
        if (!isInsideGrid(check.pos)) continue;
        if (flowField?.[check.pos.x]?.[check.pos.y]?.weight !== Infinity) continue;

        const blockRect = {
          left: check.pos.x * gridConfig.TILE_SIZE,
          top: check.pos.y * gridConfig.TILE_SIZE,
          right: (check.pos.x + 1) * gridConfig.TILE_SIZE,
          bottom: (check.pos.y + 1) * gridConfig.TILE_SIZE,
        };

        const pushX = check.offsetX < 0 ? blockRect.right + radius : blockRect.left - radius;
        const pushY = check.offsetY < 0 ? blockRect.bottom + radius : blockRect.top - radius;

        const distX = Math.abs(resultPos.x - pushX);
        const distY = Math.abs(resultPos.y - pushY);

        if (distX < distY) {
          resultPos.x = pushX;
        } else {
          resultPos.y = pushY;
        }

        break;
      }
    }

    return { x: Math.floor(resultPos.x), y: Math.floor(resultPos.y) };
  }

  public getFacingDirection(): number {
    let angle: number = 0;

    switch (this._instance.facingDirection) {
      case Direction.RIGHT:
        angle = 0;
        break;
      case Direction.DOWN:
        angle = 90 * (Math.PI / 180);
        break;
      case Direction.LEFT:
        angle = 180 * (Math.PI / 180);
        break;
      case Direction.UP:
        angle = 270 * (Math.PI / 180);
        break;
      default:
        assertNever(this._instance.facingDirection);
    }

    return angle;
  }
}
