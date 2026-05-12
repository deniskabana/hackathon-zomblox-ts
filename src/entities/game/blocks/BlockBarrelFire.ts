import { GRID_CONFIG, gridToWorld } from "../../../config/core/grid.config";
import type GameInstance from "../../../GameInstance";
import { EntityType } from "../../../types/EntityType";
import { ZIndex } from "../../../types/ZIndex";
import AEntity, { type AEntityEngine, type EntityConstructorProps } from "../../engine/AEntity";
import type { EntityAnimationsSpecs } from "../../engine/systems/EntityAnimation";

/** `this.gameInstance` */ let _game: GameInstance;

interface Instance {
  lightSourceId: number | undefined;
}

export default class BlockBarrelFire extends AEntity<undefined, Instance> {
  constructor({ gameInstance, entityId, gridPos }: EntityConstructorProps) {
    _game = gameInstance;
    const { SettingsManager, LightManager, AssetManager } = _game.MANAGERS;
    const settings = SettingsManager.getSettings().blocks;
    const size = GRID_CONFIG.TILE_SIZE;

    const instance: Instance = { lightSourceId: undefined };

    const animations: EntityAnimationsSpecs = {
      fps: 15,
      frameWidth: 128,
      frameHeight: 128,
      animations: [{ id: "fire", assetVariants: [AssetManager.getImageAsset("SFire")!], frameCount: 14 }],
    };

    super({
      worldPos: gridToWorld(gridPos),
      health: settings.healthFireBarrel,
      entityId,
      animations,
      size,
      initialState: undefined,
      timers: undefined,
      instance,
    });

    this._instance.lightSourceId = LightManager.addLightSource(this._getWorldPosition());
  }

  public _engine: AEntityEngine = {
    draw: () => {
      const { LevelManager, DrawManager } = _game.MANAGERS;
      const { x, y } = this._getWorldPosition();
      const size = this._getSize();

      const tileset = LevelManager.getTileset();
      if (!tileset) return;

      const barrelSprite = tileset.getTileFrame(599);
      if (!barrelSprite) return;

      DrawManager.queueDrawSprite(
        x,
        y,
        barrelSprite.spriteSheet,
        barrelSprite.frameIndex,
        GRID_CONFIG.TILE_SIZE,
        GRID_CONFIG.TILE_SIZE,
        ZIndex.BLOCKS,
      );

      this._animations?.drawActiveAnimations(this._getWorldPosition(), size, DrawManager);
    },

    updateAfter: () => {
      const { SettingsManager } = _game.MANAGERS;
      const settings = SettingsManager.getSettings().blocks;
      if (this._getHealth() !== Infinity && !settings.enableDestruction) {
        this._setHealth(Infinity);
      }
    },

    drawDebug: () => {},

    onDestroy: () => {
      const { LightManager } = _game.MANAGERS;
      const { lightSourceId } = this._instance;
      if (lightSourceId) LightManager.removeLightSource(lightSourceId);
    },

    onDamage: () => {
      const { AssetManager } = _game.MANAGERS;
      AssetManager.playAudioAsset("ABlockWoodDamaged", "sound", 0.5);
    },

    onDeath: () => {
      const { AssetManager, LevelManager } = _game.MANAGERS;
      AssetManager.playAudioAsset("ABlockWoodDestroyed", "sound");
      LevelManager.destroyEntity(this._entityId, EntityType.BLOCK);
    },
  };
}
