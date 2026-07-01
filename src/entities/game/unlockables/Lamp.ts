import { GRID_CONFIG } from "../../../config/core/grid.config";
import type GameInstance from "../../../GameInstance";
import type { ShopItemId } from "../../../managers/ShopManager";
import { ZIndex } from "../../../types/lib/ZIndex";
import SpriteSheet from "../../../utils/classes/SpriteSheet";
import AEntity, { type AEntityEngineBody, type EntityConstructorProps } from "../../engine/AEntity";
import { EntityCollisionShape } from "../../engine/systems/EntityCollisionPoints";

/** `this.gameInstance` */ let _game: GameInstance;

export default class Lamp extends AEntity {
  _spritesheet: SpriteSheet;
  _isUnlocked: boolean;
  _shopUnlockableId: ShopItemId;

  constructor({
    gameInstance,
    entityId,
    worldPos,
    shopUnlockableId,
  }: EntityConstructorProps & { shopUnlockableId: ShopItemId }) {
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
    this._shopUnlockableId = shopUnlockableId;
  }

  public _engine: AEntityEngineBody = {
    draw: () => {
      const { AssetManager, DrawManager, LevelManager, InventoryManager, LightManager } = _game.MANAGERS;
      const { x, y } = this._getWorldPosition();

      const size = GRID_CONFIG.TILE_SIZE;
      const isUnlocked = InventoryManager.playerOwnsItem(LevelManager.player!._getEntityId(), this._shopUnlockableId);

      if (!this._isUnlocked && isUnlocked) {
        this._isUnlocked = isUnlocked;
        LightManager.addLightSource({ x: x - size / 2, y: y - size - size / 2 }, 5.5);
      }

      if (this._isUnlocked) {
        const glowSize = this._getSize() * 2;
        const sprite = AssetManager.getImageAsset("IFXLightSource")!;
        DrawManager.queueDraw(
          x - glowSize / 2 - 4,
          y - glowSize / 2 - size - 20,
          sprite,
          glowSize,
          glowSize,
          ZIndex.EFFECTS,
          0,
          0.8,
        );
      }

      DrawManager.queueDrawSprite(
        x - size / 2 + 12,
        y - size - size / 2 - 8,
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
