import { GRID_CONFIG } from "../../../config/core/grid.config";
import type GameInstance from "../../../GameInstance";
import { ZIndex } from "../../../types/lib/ZIndex";
import AEntity, { type AEntityEngineBody, type EntityConstructorProps } from "../../engine/AEntity";
import { EntityCollisionShape } from "../../engine/systems/EntityCollisionPoints";

/** `this.gameInstance` */ let _game: GameInstance;

export default class BlockWood extends AEntity {
  constructor({ gameInstance, entityId, worldPos }: EntityConstructorProps) {
    _game = gameInstance;
    const { SettingsManager } = _game.MANAGERS;
    const settings = SettingsManager.getSettings().blocks;
    const worldSize = GRID_CONFIG.TILE_SIZE;

    super({
      worldPos,
      health: settings.healthWood,
      collisionPoints: EntityCollisionShape.GetSquare(0, 0, worldSize),
      entityId,
      animations: undefined,
      size: worldSize,
      initialState: undefined,
      timers: undefined,
      instance: undefined,
    });
  }

  public _engine: AEntityEngineBody = {
    draw: () => {
      const { LevelManager, DrawManager, SettingsManager } = _game.MANAGERS;
      const debugFlowField = SettingsManager.getSettings().rules.debugDrawFlowFieldGrid;
      const { x, y } = this._getWorldPosition();
      const size = this._getSize();

      const tileset = LevelManager.getTileset();
      if (!tileset) return;

      const spriteTop = tileset.getTileFrame(469 + 1);
      const spriteBottom = tileset.getTileFrame(509 + 1);
      if (!spriteTop || !spriteBottom) return;

      DrawManager.queueDrawSprite(
        x,
        y + size * 0.15,
        spriteBottom.spriteSheet,
        spriteBottom.frameIndex,
        size,
        size,
        ZIndex.BLOCKS,
        0,
        debugFlowField ? 0.4 : 1,
      );
      DrawManager.queueDrawSprite(
        x,
        y - size + size * 0.15,
        spriteTop.spriteSheet,
        spriteTop.frameIndex,
        size,
        size,
        ZIndex.MAP_OVERLAY,
        0,
        debugFlowField ? 0.4 : 1,
      );
    },

    updateAfter: () => {
      const { SettingsManager } = _game.MANAGERS;
      const settings = SettingsManager.getSettings().blocks;
      if (this._getHealth() !== Infinity && !settings.enableDestruction) {
        this._setHealth(Infinity);
      }
    },

    drawDebug: () => {
      const { SettingsManager, DrawManager } = _game.MANAGERS;
      const settings = SettingsManager.getSettings().blocks;
      const color = "#6fafda";

      if (settings.debugDrawWireframe) {
        const wfX = this._getCollisionPoints()[0].x + 1;
        const wfY = this._getCollisionPoints()[0].y + 1;
        const wfW = this._getCollisionPoints()[2].x - wfX - 1;
        const wfH = this._getCollisionPoints()[2].y - wfY - 1;

        DrawManager.drawRectOutline(wfX, wfY, wfW, wfH, color, 1.5);
      }
    },

    onDeath: () => {
      const { AssetManager, EntityManager, LevelManager } = _game.MANAGERS;
      AssetManager.playAudioAsset("ABlockWoodDestroyed", "sound");
      EntityManager.destroyEntity(this._entityId);
      LevelManager.destroyBlock();
    },
  };
}
