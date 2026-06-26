import Matter from "matter-js";
import { type GridPosition, type WorldPosition, GRID_CONFIG, gridToWorld } from "../../../config/core/grid.config";
import type { AssetAudioName } from "../../../config/game/assets.config";
import { type Weapon, DEF_WEAPONS } from "../../../config/game/weapons.config";
import type GameInstance from "../../../GameInstance";
import { GameControls } from "../../../types/GameControls";
import type { Vector } from "../../../types/lib/Vector";
import { ZIndex } from "../../../types/lib/ZIndex";
import assertNever from "../../../utils/assertNever";
import SpriteSheet from "../../../utils/classes/SpriteSheet";
import { Direction } from "../../../utils/getCardinalDirection";
import AEntity, { type AEntityEngineBody, type EntityConstructorProps } from "../../engine/AEntity";
import type { EntityAnimationsSpecs } from "../../engine/systems/EntityAnimation";
import { EntityCollisionShape } from "../../engine/systems/EntityCollisionPoints";
import { EntityTimer } from "../../engine/systems/EntityTimer";
import type { RaycastHit } from "../../../types/RaycastHit";
import type { EntityID } from "../../../managers/engine/EntityManager";
import { GridTileState } from "../../../utils/grid/generateMapBlockGrid";
import raycastAABB from "../../../utils/raycastAABB";
import getShotSpreadDirections from "../../../utils/getShotSpreadDirections";

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
    const { TILE_SIZE } = GRID_CONFIG;
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
      fps: 12,
      animations: [
        {
          id: "idle",
          frameCount: 6,
          assetVariants: [AssetManager.getImageAsset("SPlayerIdle")!],
          fps: 10,
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
    const colliderOffsetY = -TILE_SIZE * 0.2;

    super({
      worldPos: gridToWorld(gridPos),
      size: worldSize,
      entityId,
      animations,
      collisionPoints: EntityCollisionShape.GetRectangle(
        { x: -colliderWidth / 2, y: -colliderHeight / 2 + colliderOffsetY },
        { x: colliderWidth / 2, y: colliderHeight / 2 + colliderOffsetY },
      ),
      hitboxesPoints: [
        // Head
        EntityCollisionShape.GetRectangle(
          { x: -TILE_SIZE / 2 + 8, y: -TILE_SIZE - 1 },
          { x: TILE_SIZE / 2 - 8, y: -TILE_SIZE / 4 - 2 },
        ),
        // Body
        EntityCollisionShape.GetRectangle(
          { x: -TILE_SIZE / 5, y: -TILE_SIZE / 4 - 2 },
          { x: TILE_SIZE / 5, y: TILE_SIZE / 4 - 2 },
        ),
      ],
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
        DrawManager.drawLine(x - 4, y - 4, x + 4, y + 4, color, 1);
        DrawManager.drawLine(x + 4, y - 4, x - 4, y + 4, color, 1);
      }

      if (settings.debugDrawState) {
        DrawManager.drawRectFilled(x - TILE_SIZE / 2, y - TILE_SIZE * 1.1 - 11, TILE_SIZE, 15, "#000", 0.5);
        DrawManager.drawText(this._getState(), x, y - TILE_SIZE * 1.1, color, 13, "Courier New", "center", 1, true);
      }

      if (settings.debugDrawHitboxes) {
        for (const hitbox of this._hitboxesPoints) {
          const color = "#4fafaa";
          const wfX = x + hitbox[0].x;
          const wfY = y + hitbox[1].y;
          const wfW = hitbox[1].x - hitbox[0].x;
          const wfH = hitbox[2].y - hitbox[1].y;

          DrawManager.drawRectOutline(wfX, wfY, wfW, wfH, color, 1);
        }
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
    const maxDistance = weaponDef.maxDistance * GRID_CONFIG.TILE_SIZE;
    const size = this._getSize();
    const playerCardinalDirection = this._instance.facingDirection;
    const { x, y } = this._getWorldPosition();

    if (!InputManager.isHeld(GameControls.ACTION_SHOOT)) return;
    if (state === PlayerState.KNOCKED || state === PlayerState.DEAD) return;
    if (!this._timers.attackCooldown.getIsDone()) return;

    this._timers.attackCooldown.reset(weaponDef.cooldown);
    if (weaponSound) AssetManager.playAudioAsset(weaponSound, "sound");

    const directionVector: Vector = { x: 0, y: 0 };
    switch (this._instance.facingDirection) {
      case Direction.UP:
        directionVector.y = -1;
        break;
      case Direction.DOWN:
        directionVector.y = 1;
        break;
      case Direction.LEFT:
        directionVector.x = -1;
        break;
      case Direction.RIGHT:
        directionVector.x = 1;
        break;
    }

    let originOffsetX: number = 0;
    let originOffsetY: number = 0;

    // Offset for where shoot line VFX starts
    switch (playerCardinalDirection) {
      case Direction.DOWN:
        originOffsetY = size * 0.25;
        if (isFacingLeft) originOffsetX = size * 0.1 * -1;
        else originOffsetX = size * 0.15;
        break;
      case Direction.UP:
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

    const origin: WorldPosition = { x: x + originOffsetX, y: y + originOffsetY };
    const directions = getShotSpreadDirections(directionVector, {
      pellets: weaponDef.shots,
      spreadAngle: weaponDef.spread,
    });
    const raycastHits = directions.map((dir) => this._raycast(origin, dir, maxDistance));

    for (let i = 0; i < raycastHits.length; i++) {
      const hit = raycastHits[i];

      if (hit === null) {
        const endOfRayPos: WorldPosition = {
          x: directions[i].x * maxDistance + origin.x,
          y: directions[i].y * maxDistance + origin.y,
        };
        VFXManager.drawShootLine(origin, endOfRayPos);
      } else {
        switch (hit.type) {
          case "entity":
            hit.entity._handleDamage(weaponDef.damage);
            break;
          case "wall":
            break;
          default:
            break;
        }

        VFXManager.drawShootLine(origin, hit.point);
      }
    }

    CameraManager.effectZoom(3 + weaponDef.damage * (weaponDef.shots / 2) * 0.6);
    CameraManager.effectShake(3 + weaponDef.damage * (weaponDef.shots / 2) * 0.6);
  }

  private _raycast(origin: Vector, direction: Vector, maxDistance: number): RaycastHit | null {
    const { LevelManager } = _game.MANAGERS;
    const { TILE_SIZE } = GRID_CONFIG;
    const step = TILE_SIZE / 12;

    const checkedEntities = new Set<EntityID>();
    let distance = 0;
    let lastGridPos = { x: -1, y: -1 };
    let closestEntityHit: RaycastHit | null = null;

    while (distance <= maxDistance) {
      const point = {
        x: origin.x + direction.x * distance,
        y: origin.y + direction.y * distance,
      };

      const gridX = Math.floor(point.x / TILE_SIZE);
      const gridY = Math.floor(point.y / TILE_SIZE);
      const isNewCell = gridX !== lastGridPos.x || gridY !== lastGridPos.y;

      if (isNewCell) {
        lastGridPos = { x: gridX, y: gridY };

        if (LevelManager.levelGrid?.[gridX]?.[gridY] === GridTileState.BLOCKED) {
          if (!closestEntityHit || distance < closestEntityHit.distance) return { type: "wall", point, distance };
        }

        const entities = LevelManager.getEntitiesByGridTile({ x: gridX, y: gridY });

        for (const entity of entities) {
          if (checkedEntities.has(entity._getEntityId())) continue;
          checkedEntities.add(entity._getEntityId());

          const hit = raycastAABB(origin, direction, maxDistance, entity._getHitboxes());
          if (hit && (!closestEntityHit || hit.distance <= closestEntityHit.distance)) {
            if (!entity._getIsDead()) closestEntityHit = { type: "entity", entity, ...hit };
          }
        }
      }

      distance += step;
    }

    return closestEntityHit;
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
    const speed = settings.movementSpeed;

    if (vector.x === 0 && vector.y === 0) {
      this._setState(PlayerState.IDLE);
      return;
    }

    if (vector.x < 0) this._instance.isFacingLeft = true;
    if (vector.x > 0) this._instance.isFacingLeft = false;

    if (!this._physicsBody) return;

    Matter.Body.setVelocity(this._physicsBody, vector);
    Matter.Body.setSpeed(this._physicsBody, speed / 50);
    this._setState(PlayerState.WALK);

    if (this._timers.stepSound.getIsDone()) {
      this._timers.stepSound.reset(settings.stepSoundCooldownSec);
      AssetManager.playAudioAsset("APlayerStep", "sound");
    }
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
