import { type GridPosition, gridToWorld, GRID_CONFIG } from "../../config/core/grid.config";
import type GameInstance from "../../GameInstance";
import { EntityType } from "../../types/EntityType";
import { ZIndex } from "../../types/ZIndex";
import { AnimatedSpriteSheet } from "../../utils/classes/AnimatedSpriteSheet";
import AEntity, { type EntityAnimations, type EntityBuiltInMethods } from "../abstract/AEntity";

/** `this.gameInstance` */ let _game: GameInstance;

interface Instance {
  lightSourceId: number | undefined;
}

export default class BlockBarrelFire extends AEntity<undefined, Instance, undefined, EntityAnimations> {
  constructor(gridPos: GridPosition, entityId: number, gameInstance: GameInstance) {
    _game = gameInstance;
    const { GameManager, LightManager, AssetManager } = _game.MANAGERS;
    const settings = GameManager.getSettings().rules.blocks;
    const size = GRID_CONFIG.TILE_SIZE;
    const fps = 15;
    const instance: Instance = { lightSourceId: undefined };
    const animationList = [AnimatedSpriteSheet.fromGrid(AssetManager.getImageAsset("SFire")!, 32, 48, 14, fps, true)];
    const animations: EntityAnimations = {
      fps,
      animationList,
      activeAnimations: [0],
    };

    super({
      worldPos: gridToWorld(gridPos),
      health: settings.woodStartHealth,
      entityId,
      animations,
      size,
      initialState: undefined,
      timers: undefined,
      instance,
    });

    this._instance.lightSourceId = LightManager.addLightSource(this._getWorldPosition());
  }

  public _builtIn: EntityBuiltInMethods = {
    draw: () => {
      const { LevelManager, DrawManager } = _game.MANAGERS;
      const { x, y } = this._getWorldPosition();
      const size = this._getSize();
      const currentAnimation = this._animations.animationList[this._animations.activeAnimations?.[0] ?? 0];

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

      if (!currentAnimation) return;

      DrawManager.queueDrawSprite(
        x,
        y - size,
        currentAnimation,
        currentAnimation.getCurrentFrame(),
        size,
        size * 1.5,
        ZIndex.EFFECTS,
        0,
      );
    },

    drawDebug: () => {},

    update: (_deltaTime) => {},

    destructor: () => {
      const { LevelManager, LightManager } = _game.MANAGERS;
      const { lightSourceId } = this._instance;

      if (lightSourceId) LightManager.removeLightSource(lightSourceId);
      LevelManager.destroyEntity(this._entityId, EntityType.BLOCK);
    },

    onDamage: () => {
      const { AssetManager } = _game.MANAGERS;
      AssetManager.playAudioAsset("ABlockWoodDamaged", "sound", 0.5);
    },

    onDeath: () => {
      const { AssetManager } = _game.MANAGERS;
      AssetManager.playAudioAsset("ABlockWoodDestroyed", "sound");
    },
  };
}
