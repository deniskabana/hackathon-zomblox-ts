import { gridToWorld, GRID_CONFIG } from "../../../config/core/grid.config";
import type GameInstance from "../../../GameInstance";
import { EntityType } from "../../../types/EntityType";
import { ZIndex } from "../../../types/ZIndex";
import AEntity, { type AEntityEngine, type EntityConstructorProps } from "../../engine/AEntity";

/** `this.gameInstance` */ let _game: GameInstance;

export default class BlockWood extends AEntity {
  constructor({ gameInstance, entityId, gridPos }: EntityConstructorProps) {
    _game = gameInstance;
    const { SettingsManager } = _game.MANAGERS;
    const settings = SettingsManager.getSettings().blocks;

    super({
      worldPos: gridToWorld(gridPos),
      health: settings.healthWood,
      entityId,
      animations: undefined,
      size: GRID_CONFIG.TILE_SIZE,
      initialState: undefined,
      timers: undefined,
      instance: undefined,
    });
  }

  public _engine: AEntityEngine = {
    draw: () => {
      const { LevelManager, DrawManager } = _game.MANAGERS;
      const { x, y } = this._getWorldPosition();
      const size = this._getSize();

      const tileset = LevelManager.getTileset();
      if (!tileset) return;

      const spriteTop = tileset.getTileFrame(469 + 1);
      const spriteBottom = tileset.getTileFrame(509 + 1);
      if (!spriteTop || !spriteBottom) return;

      DrawManager.queueDrawSprite(
        x,
        y,
        spriteBottom.spriteSheet,
        spriteBottom.frameIndex,
        size,
        size,
        ZIndex.BLOCKS,
        0,
      );
      DrawManager.queueDrawSprite(
        x,
        y - size,
        spriteTop.spriteSheet,
        spriteTop.frameIndex,
        size,
        size,
        ZIndex.MAP_OVERLAY,
        0,
      );
    },

    updateAfter: () => {
      const { SettingsManager } = _game.MANAGERS;
      const settings = SettingsManager.getSettings().blocks;
      if (this._getHealth() !== Infinity && !settings.enableDestruction) {
        this._setHealth(Infinity);
      }
    },

    drawDebug: () => {},

    onDeath: () => {
      const { AssetManager, LevelManager } = _game.MANAGERS;
      AssetManager.playAudioAsset("ABlockWoodDestroyed", "sound");
      LevelManager.destroyEntity(this._entityId, EntityType.BLOCK);
    },
  };
}
