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
import { GameControls } from "../../../types/GameControls";
import type { Vector } from "../../../types/lib/Vector";
import { ZIndex } from "../../../types/lib/ZIndex";
import assertNever from "../../../utils/assertNever";
import SpriteSheet from "../../../utils/classes/SpriteSheet";
import { Direction } from "../../../utils/getCardinalDirection";
import { GridTileState } from "../../../utils/grid/generateMapBlockGrid";
import areVectorsEqual from "../../../utils/math/areVectorsEqual";
import { clamp } from "../../../utils/math/clamp";
import radiansToVector from "../../../utils/math/radiansToVector";
import AEntity, { type AEntityEngineBody, type AnyEntity, type EntityConstructorProps } from "../../engine/AEntity";
import type { EntityAnimationsSpecs } from "../../engine/systems/EntityAnimation";
import { EntityCollisionShape } from "../../engine/systems/EntityCollisionPoints";
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
  stepSound: EntityTimer<"Delay between steps">;
}

interface Instance {
  maxSpeed: number;
  speed: number;
  isFacingLeft: boolean;
  prevGridPos: GridPosition | undefined;
  currentWeapon: Weapon;
  facingDirection: Direction;
  weaponSprites: SpriteSheet | undefined;
}

export default class Player extends AEntity<PlayerState, Instance, Timers> {
  constructor({ gameInstance, entityId, gridPos }: EntityConstructorProps) {
    _game = gameInstance;
    const { SettingsManager, AssetManager } = _game.MANAGERS;
    const { worldSize, startHealth, movementSpeed, defaultWeapon, stunCooldownSec, stepSoundCooldownSec } =
      SettingsManager.getSettings().player;

    const timers: Timers = {
      attackCooldown: new EntityTimer({ initialValue: DEF_WEAPONS[defaultWeapon].cooldown, autoStart: true }), // Value filled by WEAPON_DEF['cooldown']
      stepSound: new EntityTimer({ initialValue: stepSoundCooldownSec, autoStart: true }),
      stun: new EntityTimer({ initialValue: stunCooldownSec, autoStart: false }),
    };

    const animations: EntityAnimationsSpecs = {
      frameWidth: 32,
      frameHeight: 32,
      fps: 11,
      animations: [
        {
          id: "idle",
          frameCount: 6,
          assetVariants: [AssetManager.getImageAsset("SPlayerIdle")!],
          fps: 7,
        },
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
      maxSpeed: movementSpeed,
      facingDirection: Direction.RIGHT,
      weaponSprites: SpriteSheet.fromGrid(AssetManager.getImageAsset("SPlayerWeapons")!, 32, 32, 12),
    };

    const colliderWidth = worldSize * 0.22;
    const colliderHeight = worldSize * 0.3;
    const colliderOffsetY = -GRID_CONFIG.TILE_SIZE * 0.2;

    super({
      worldPos: gridToWorld(gridPos),
      size: worldSize,
      entityId,
      animations,
      collisionPoints: EntityCollisionShape.GetRectangle(
        { x: -colliderWidth / 2, y: -colliderHeight / 2 + colliderOffsetY },
        { x: colliderWidth / 2, y: colliderHeight / 2 + colliderOffsetY },
      ),
      initialState: PlayerState.IDLE,
      timers,
      health: startHealth,
      instance,
    });
  }

  public _engine: AEntityEngineBody = {
    draw: () => {
      const { DrawManager } = _game.MANAGERS;

      const size = this._getSize();
      this._animations?.drawActiveAnimations(this._getWorldPosition(), size, DrawManager, {
        scaleX: this._instance.isFacingLeft ? 1 : -1,
        offset: { x: 0, y: -this._getSize() * 0.35 },
      });

      const weaponSize = GRID_CONFIG.TILE_SIZE * 1.5;
      this.drawWeapon(weaponSize);
    },

    drawDebug: () => {
      const { SettingsManager, DrawManager } = _game.MANAGERS;
      const settings = SettingsManager.getSettings().player;
      const { x, y } = this._getWorldPosition();
      const { TILE_SIZE } = GRID_CONFIG;
      const size = TILE_SIZE;
      const color = "#ef9f4a";

      if (settings.debugDrawWireframe) {
        const color = "#ef9ffa";
        const wfX = this._getCollisionPoints()[0].x;
        const wfY = this._getCollisionPoints()[0].y;
        const wfW = this._getCollisionPoints()[2].x - wfX;
        const wfH = this._getCollisionPoints()[2].y - wfY;

        DrawManager.drawRectOutline(wfX, wfY, wfW, wfH, color, 1);
      }

      if (settings.debugDrawPosition) {
        DrawManager.drawLine(x - size / 4, y - size / 4, x + size / 4, y + size / 4, color, 2);
        DrawManager.drawLine(x + size / 4, y - size / 4, x - size / 4, y + size / 4, color, 2);
      }

      if (settings.debugDrawState) {
        DrawManager.drawRectFilled(x - TILE_SIZE / 2, y - TILE_SIZE * 1.1 - 11, TILE_SIZE, 15, "#000", 0.5);
        DrawManager.drawText(this._getState(), x, y - TILE_SIZE * 1.1, color, 13, "Courier New", "center", 1, true);
      }
    },

    drawShadow: () => {
      const { DrawManager, AssetManager } = _game.MANAGERS;
      const { x, y } = this._getWorldPosition();
      const shadowSprite = AssetManager.getImageAsset("IFXEntityShadow");
      const size = this._getSize() * 0.75;

      if (!shadowSprite) return;
      DrawManager.queueDraw(x - size / 2, y - size * 0.55, shadowSprite, size, size, ZIndex.GROUND_EFFECTS);
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
      const { AssetManager, CameraManager, SettingsManager } = _game.MANAGERS;
      const settings = SettingsManager.getSettings().player;

      this._timers.stun.reset(settings.stunCooldownSec);
      this._setState(PlayerState.KNOCKED);

      CameraManager.effectZoom(amount * 2);
      CameraManager.effectShake(amount * 5);

      if (this._getHealth() - amount > 0) {
        AssetManager.playAudioAsset("APlayerHurt", "sound");
      }

      if (settings.debugIsInvincible) return false;
    },

    onDeath: () => {
      const { VFXManager, AssetManager, EntityManager } = _game.MANAGERS;

      this._setState(PlayerState.DEAD);

      VFXManager.drawBloodOnScreen(600);
      AssetManager.playAudioAsset("APlayerDie", "sound");
      EntityManager.destroyEntity(this._entityId);
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

  private getMovementInputVector(): Vector {
    const { InputManager } = _game.MANAGERS;
    const { controls } = InputManager.getFrame();

    const up = controls[GameControls.MOVE_UP].held;
    const down = controls[GameControls.MOVE_DOWN].held;
    const left = controls[GameControls.MOVE_LEFT].held;
    const right = controls[GameControls.MOVE_RIGHT].held;

    const horizontal = left || right;
    const vertical = up || down;

    let x = 0;
    let y = 0;

    if (horizontal && !vertical) {
      x = right ? 1 : -1;
      this._instance.facingDirection = right ? Direction.RIGHT : Direction.LEFT;
    } else if (vertical && !horizontal) {
      y = down ? 1 : -1;
      this._instance.facingDirection = down ? Direction.DOWN : Direction.UP;
    } else if (horizontal && vertical) {
      // Most recent
      const hPressed = controls[GameControls.MOVE_LEFT].pressed || controls[GameControls.MOVE_RIGHT].pressed;
      if (hPressed) {
        x = right ? 1 : -1;
        this._instance.facingDirection = right ? Direction.RIGHT : Direction.LEFT;
      } else {
        y = down ? 1 : -1;
        this._instance.facingDirection = down ? Direction.DOWN : Direction.UP;
      }
    }

    return { x, y };
  }

  private getBuildingModeInput(_deltaTime: number): void {
    const { InputManager, BuildModeManager } = _game.MANAGERS;
    if (!InputManager.wasReleased(GameControls.PLAYER_BUILD_MENU)) return;
    InputManager.consumeAction(GameControls.PLAYER_BUILD_MENU);
    BuildModeManager.setBuildMode(!BuildModeManager.isBuildModeActive);
  }

  private getShootingInput(): void {
    const { InputManager, AssetManager, CameraManager, VFXManager } = _game.MANAGERS;
    const state = this._getState();
    const weaponSound = this.getCurrentWeaponSound();
    const { currentWeapon, isFacingLeft } = this._instance;
    const weaponDef = DEF_WEAPONS[currentWeapon];
    const gunSpread = weaponDef.spread;
    // const maxDistance = weaponDef.maxDistance * GRID_CONFIG.TILE_SIZE;
    const size = this._getSize();
    const playerCardinalDirection = this._instance.facingDirection;
    const { x, y } = this._getWorldPosition();

    if (!InputManager.isHeld(GameControls.ACTION_SHOOT)) return;
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
      // const raycastHit = LevelManager.raycastShot(this._getWorldPosition(), angle, maxDistance);

      // if (raycastHit) raycastHit._handleDamage(weaponDef.damage);

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
        // raycastHit ? getVectorDistance(this._getWorldPosition(), raycastHit._getWorldPosition()) : maxDistance,
      );
    }

    CameraManager.effectZoom(3 + weaponDef.damage * (weaponDef.shots / 2) * 0.6);
    CameraManager.effectShake(3 + weaponDef.damage * (weaponDef.shots / 2) * 0.6);
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
    const allWeaponsDef = Object.keys(DEF_WEAPONS) as Weapon[];

    if (!InputManager.wasReleased(GameControls.PLAYER_CHANGE_WEAPON)) return;
    InputManager.consumeAction(GameControls.PLAYER_CHANGE_WEAPON);

    const currentIndex = allWeaponsDef.findIndex((n) => n === this._instance.currentWeapon);
    this._instance.currentWeapon = allWeaponsDef[(currentIndex + 1) % allWeaponsDef.length];
  }

  private applyMovement(_deltaTime: number): void {
    const { AssetManager, SettingsManager } = _game.MANAGERS;
    const settings = SettingsManager.getSettings().player;
    const vector = this.getMovementInputVector();
    const state = this._getState();
    const { x, y } = this._getWorldPosition();
    const speed = settings.movementSpeed;

    if (vector.x === 0 && vector.y === 0) {
      if (state === PlayerState.WALK) this._setState(PlayerState.IDLE);
      return;
    }

    const futurePos: WorldPosition = {
      x: x + vector.x * _deltaTime * speed,
      y: y + vector.y * _deltaTime * speed,
    };

    if (settings.debugDisablePhysics) {
      this._setWorldPosition(futurePos);
      this._setState(PlayerState.WALK);
      return;
    }

    const adjustedFuturePos = this.adjustMovementForCollisions(futurePos);

    if (areVectorsEqual(adjustedFuturePos, this._getWorldPosition())) {
      this._setState(PlayerState.IDLE);
      return;
    }

    if (futurePos.x < x) this._instance.isFacingLeft = true;
    else if (futurePos.x > x) this._instance.isFacingLeft = false;

    this._setWorldPosition(adjustedFuturePos);
    this._setState(PlayerState.WALK);

    if (this._timers.stepSound.getIsDone()) {
      AssetManager.playAudioAsset("APlayerStep", "sound");
      this._timers.stepSound.reset(settings.stepSoundCooldownSec);
    }
  }

  public handlePhysicsPushback(direction: number, strength: number = 1): void {
    const movementVector = radiansToVector(direction);
    const { x, y } = this._getWorldPosition();
    const futurePos = { x: x + movementVector.x * strength, y: y + movementVector.y * strength };

    this._setWorldPosition(this.adjustMovementForCollisions(futurePos, GRID_CONFIG, true));
  }

  private adjustMovementForCollisions(
    futurePos: WorldPosition,
    gridConfig: GridConfig = GRID_CONFIG,
    includeWorldBoundaries: boolean = true,
  ): WorldPosition {
    const { LevelManager } = _game.MANAGERS;
    const { x, y } = this._getWorldPosition();
    const { x: gx, y: gy } = this._getGridPosition();
    const resultPos: WorldPosition = { ...futurePos };

    if (includeWorldBoundaries) {
      const { TILE_SIZE, GRID_WIDTH, GRID_HEIGHT } = gridConfig;
      const threshold = TILE_SIZE;
      const futureHitboxes = this._getCollisionPoints(futurePos);
      if (futureHitboxes[0].x < 0 + threshold || futureHitboxes[2].x > TILE_SIZE * GRID_WIDTH - threshold)
        resultPos.x = clamp(0 + threshold, resultPos.x, TILE_SIZE * GRID_HEIGHT - threshold);
      if (futureHitboxes[0].y < 0 + threshold || futureHitboxes[2].y > TILE_SIZE * GRID_HEIGHT - threshold)
        resultPos.y = clamp(0 + threshold, resultPos.y, TILE_SIZE * GRID_HEIGHT - threshold);
      if (areVectorsEqual(resultPos, this._getWorldPosition())) return resultPos;
    }

    const hitboxPoints = this._getCollisionPoints(resultPos);
    // const enemyGrid = LevelManager.getEnemyGrid();
    const blockGrid = LevelManager.getBlockGrid();

    const deltaX = x - futurePos.x;
    const deltaY = y - futurePos.y;

    for (const corner of hitboxPoints) {
      const checkX = corner.x;
      const checkY = corner.y;
      const checkGridPos = worldToGrid({ x: checkX, y: checkY });
      const entities = blockGrid?.[checkGridPos.x]?.[checkGridPos.y];

      if (LevelManager.levelGrid?.[checkGridPos.x]?.[checkGridPos.y] === GridTileState.BLOCKED) {
        resultPos.x = x;
        resultPos.y = y;
        return resultPos;
      }
      if (LevelManager.levelGrid?.[checkGridPos.x]?.[gy] === GridTileState.BLOCKED) resultPos.x = x;
      if (LevelManager.levelGrid?.[gx]?.[checkGridPos.y] === GridTileState.BLOCKED) resultPos.y = y;

      if (!entities) continue;
      for (const entity of entities) {
        if (entity._getIsVectorInsideHitbox({ x: checkX + deltaX, y: checkY + deltaY })) {
          resultPos.x = x;
          resultPos.y = y;
          return resultPos;
        }

        if (entity._getIsVectorInsideHitbox({ x: checkX + deltaX, y: checkY })) resultPos.x = x;
        if (entity._getIsVectorInsideHitbox({ x: checkX, y: checkY + deltaY })) resultPos.y = y;
        if (areVectorsEqual(resultPos, this._getWorldPosition())) break;
      }
    }

    // Re-derive hitboxes from resultPos (may have been clamped by boundary check)
    //
    // for (const corner of hitboxPoints) {
    //   const hitboxGrid = worldToGrid(corner);
    //   const enemies = enemyGrid?.[hitboxGrid.x]?.[hitboxGrid.y] || [];
    //   const blocks = blockGrid?.[hitboxGrid.x]?.[hitboxGrid.y] || [];
    //
    //   const cornerGridPos = worldToGrid({ x: Math.ceil(corner.x), y: Math.ceil(corner.y) });
    //
    //   if (LevelManager.levelGrid?.[cornerGridPos.x]?.[cornerGridPos.y] === GridTileState.BLOCKED) {
    //     resultPos.x = x;
    //     resultPos.y = y;
    //   }
    //
    //   if (areVectorsEqual(resultPos, this._getWorldPosition())) break;
    //
    //   // const slideX: WorldPosition = { x: futurePos.x, y };
    //   // const slideY: WorldPosition = { x, y: futurePos.y };
    //
    //   for (const entity of [...enemies, ...blocks]) {
    //     if (entity === this) continue;
    //     if (entity._getIsVectorInsideHitbox(corner)) {
    //       // TODO: Apply pushback instead of this
    //       resultPos.x = x
    //       resultPos.y = y
    //     }
    //     if (entity._getIsVectorInsideHitbox({ x, y })) {
    //       const entityPos = entity._getWorldPosition()
    //       resultPos.x += entityPos.x - x;
    //       resultPos.y += entityPos.y - y;
    //       break;
    //     }
    //
    //     if (areVectorsEqual(resultPos, this._getWorldPosition())) break;
    //   }
    // }

    return resultPos;
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
