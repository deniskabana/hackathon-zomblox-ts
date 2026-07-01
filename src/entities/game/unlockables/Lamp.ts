import { GRID_CONFIG } from "../../../config/core/grid.config";
import type GameInstance from "../../../GameInstance";
import { ZIndex } from "../../../types/lib/ZIndex";
import SpriteSheet from "../../../utils/classes/SpriteSheet";
import AEntity, { type AEntityEngineBody, type EntityConstructorProps } from "../../engine/AEntity";
import { EntityCollisionShape } from "../../engine/systems/EntityCollisionPoints";

/** `this.gameInstance` */ let _game: GameInstance;

export default class Lamp extends AEntity {
  _spritesheet: SpriteSheet;
  _isUnlocked: boolean;

  constructor({ gameInstance, entityId, worldPos }: EntityConstructorProps) {
    _game = gameInstance;

    const width = GRID_CONFIG.TILE_SIZE * 0.5;
    const height = GRID_CONFIG.TILE_SIZE;

    super({
      worldPos,
      entityId,
      size: GRID_CONFIG.TILE_SIZE,
      initialState: undefined,
      collisionPoints: EntityCollisionShape.GetRectangle(
        { x: -width / 2, y: -height / 2 },
        { x: width / 2, y: height / 2 },
      ),
    });

    const { AssetManager } = _game.MANAGERS;
    this._spritesheet = SpriteSheet.fromGrid(AssetManager.getImageAsset("IUnlockableLamp")!, 32, 128, 2);
    this._isUnlocked = false;
  }

  public _engine: AEntityEngineBody = {
    draw: () => {
      const { DrawManager, LevelManager, InventoryManager, LightManager } = _game.MANAGERS;
      const { x, y } = this._getWorldPosition();

      const size = GRID_CONFIG.TILE_SIZE;
      const isUnlocked = InventoryManager.playerOwnsItem(LevelManager.player!._getEntityId(), 3);

      if (!this._isUnlocked && isUnlocked) {
        this._isUnlocked = isUnlocked;
        LightManager.addLightSource({ x: x - size / 2, y: y - size - size / 2 }, 5.5);
      }

      DrawManager.queueDrawSprite(
        x - size / 2 + 12,
        y - size - size / 2,
        this._spritesheet,
        isUnlocked ? 1 : 0,
        size * 0.5,
        size * 2,
        ZIndex.MAP_OVERLAY_DECOR,
      );
    },

    drawDebug: () => {},

    onDestroy: () => {
      const { EntityManager } = _game.MANAGERS;
      EntityManager.destroyEntity(this._entityId);
    },
  };
}
