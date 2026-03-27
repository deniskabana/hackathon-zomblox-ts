import { type GridPosition, gridToWorld, GRID_CONFIG } from "../../config/core/grid.config";
import type GameInstance from "../../GameInstance";
import { EntityType } from "../../types/EntityType";
import { ZIndex } from "../../types/ZIndex";
import AEntity, { type EntityBuiltInMethods } from "../abstract/AEntity";

/** `this.gameInstance` */ let _game: GameInstance;

export default class BlockWood extends AEntity<undefined, undefined, undefined, undefined> {
  constructor(gridPos: GridPosition, entityId: number, gameInstance: GameInstance) {
    _game = gameInstance;
    const { GameManager } = _game.MANAGERS;
    const settings = GameManager.getSettings().rules.blocks;

    super({
      worldPos: gridToWorld(gridPos),
      health: settings.woodStartHealth,
      entityId,
      animations: undefined,
      size: GRID_CONFIG.TILE_SIZE,
      initialState: undefined,
      timers: undefined,
      instance: undefined,
    });
  }

  public _builtIn: EntityBuiltInMethods = {
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

    drawDebug: () => {},

    destructor: () => {
      const { LevelManager } = _game.MANAGERS;
      LevelManager.destroyEntity(this._entityId, EntityType.BLOCK);
    },

    update: (_deltaTime) => {},

    onDeath: () => {
      const { AssetManager } = _game.MANAGERS;
      AssetManager.playAudioAsset("ABlockWoodDestroyed", "sound");
    },
  };
}
